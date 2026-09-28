import { Injectable, computed, inject, signal } from '@angular/core';

import {
  AllocationSlice,
  AssetClass,
  Holding,
  PortfolioPosition,
  PricePoint,
} from '../models';
import { ASSET_CLASS_LABEL } from '../utils/format';
import { MarketService } from './market.service';

/**
 * Carteira de demonstração. A app não tem tabela de investimentos ainda — o
 * que existe no Supabase é `accounts` + `transactions`. Estas posições são o
 * seed que dá algo real para o usuário ver no Hub de Integrações.
 */
export const HOLDINGS_DEMO: Holding[] = [
  { ticker: 'PETR4', nome: 'Petróleo Brasileiro', classe: 'acao', quantidade: 120, precoMedio: 38.4 },
  { ticker: 'VALE3', nome: 'Vale', classe: 'acao', quantidade: 80, precoMedio: 62.1 },
  { ticker: 'ITSA4', nome: 'Itaúsa', classe: 'acao', quantidade: 300, precoMedio: 9.85 },
  { ticker: 'B3SA3', nome: 'B3', classe: 'acao', quantidade: 150, precoMedio: 11.4 },
  { ticker: 'WEGE3', nome: 'WEG', classe: 'acao', quantidade: 40, precoMedio: 48.9 },
  { ticker: 'MXRF11', nome: 'Maxrent', classe: 'fii', quantidade: 900, precoMedio: 10.12 },
];

/** Pesos usados para colorir a rosca de alocação sem trazer uma paleta nova. */
export const CLASS_COLOR: Record<AssetClass, string> = {
  acao: '#8b5cf6',
  fii: '#22d3ee',
  renda_fixa: '#34d399',
  cripto: '#fbbf24',
  fundo: '#f472b6',
  exterior: '#a3a3a3',
};

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly market = inject(MarketService);

  private readonly _holdings = signal<Holding[]>(HOLDINGS_DEMO);
  private readonly _posicoes = signal<PortfolioPosition[]>([]);
  private readonly _series = signal<Record<string, PricePoint[]>>({});
  private readonly _carregando = signal(false);

  readonly holdings = this._holdings.asReadonly();
  readonly posicoes = this._posicoes.asReadonly();
  readonly series = this._series.asReadonly();
  readonly carregando = this._carregando.asReadonly();

  readonly tickers = computed(() => this._holdings().map((h) => h.ticker));

  readonly custoTotal = computed(() =>
    this._posicoes().reduce((soma, p) => soma + p.custo, 0),
  );

  readonly valorTotal = computed(() => this._posicoes().reduce((soma, p) => soma + p.valor, 0));

  readonly resultadoAbsoluto = computed(() => this.valorTotal() - this.custoTotal());

  readonly resultadoPercent = computed(() => {
    const custo = this.custoTotal();
    return custo === 0 ? 0 : (this.resultadoAbsoluto() / custo) * 100;
  });

  /** Ganho do dia somando o peso de cada posição. */
  readonly variacaoDia = computed(() =>
    this._posicoes().reduce((soma, p) => soma + p.variacaoDia, 0),
  );

  readonly variacaoDiaPercent = computed(() => {
    const valor = this.valorTotal();
    return valor === 0 ? 0 : (this.variacaoDia() / valor) * 100;
  });

  readonly maiorPosicao = computed<PortfolioPosition | null>(() => {
    const lista = this._posicoes();
    if (lista.length === 0) return null;
    return lista.reduce((maior, atual) => (atual.valor > maior.valor ? atual : maior));
  });

  readonly melhorPosicao = computed<PortfolioPosition | null>(() => {
    const lista = this._posicoes();
    if (lista.length === 0) return null;
    return lista.reduce((melhor, atual) =>
      atual.resultadoPercent > melhor.resultadoPercent ? atual : melhor,
    );
  });

  readonly pioresPosicao = computed<PortfolioPosition | null>(() => {
    const lista = this._posicoes();
    if (lista.length === 0) return null;
    return lista.reduce((pior, atual) =>
      atual.resultadoPercent < pior.resultadoPercent ? atual : pior,
    );
  });

  readonly alocacao = computed<AllocationSlice[]>(() => {
    const total = this.valorTotal();
    if (total === 0) return [];

    const porClasse = new Map<AssetClass, number>();
    for (const posicao of this._posicoes()) {
      porClasse.set(posicao.classe, (porClasse.get(posicao.classe) ?? 0) + posicao.valor);
    }

    return [...porClasse.entries()]
      .map(([classe, valor]) => ({ classe, valor, peso: (valor / total) * 100 }))
      .sort((a, b) => b.valor - a.valor);
  });

  readonly totalEmPosicoes = computed(() => this._posicoes().length);

  /** Curva da carteira: cada posição pesada pela própria participação. */
  readonly performance = computed<PricePoint[]>(() => {
    const series = this._series();
    const posicoes = this._posicoes();
    if (posicoes.length === 0) return [];

    const tamanho = Math.max(...posicoes.map((p) => (series[p.ticker]?.length ?? 0)));
    if (tamanho === 0) return [];

    const custo = posicoes.reduce((soma, p) => soma + p.custo, 0);
    if (custo === 0) return [];

    const pontos: PricePoint[] = [];
    for (let i = 0; i < tamanho; i += 1) {
      let total = 0;
      let peso = 0;
      for (const posicao of this._posicoes()) {
        const serie = series[posicao.ticker];
        if (!serie || serie.length === 0) continue;
        const ponto = serie[Math.min(i, serie.length - 1)];
        if (!ponto) continue;
        total += ponto.close * posicao.quantidade;
        peso += posicao.custo;
      }
      if (peso === 0) continue;
      pontos.push({ date: series[posicoes[0].ticker]?.[i]?.date ?? '', close: Number((total / peso * 100).toFixed(2)) });
    }
    return pontos;
  });

  readonly classLabels = ASSET_CLASS_LABEL;
  readonly classColors = CLASS_COLOR;

  /**
   * Busca cotações e séries. `MarketService` já serializa e cacheia, então
   * chamar duas vezes não duplica tráfego; ainda assim o `carregando` evita que
   * a tela pisque a cada recarga.
   */
  async carregar(forcar = false): Promise<void> {
    if (this._carregando()) return;
    this._carregando.set(true);

    try {
      const resultados = await this.market.cotacoes(this.tickers(), forcar);
      const porTicker = new Map(resultados.map((r) => [r.quote.ticker, r.quote]));

      this._posicoes.set(
        this._holdings().map((holding) => {
          const quote = porTicker.get(holding.ticker);
          const preco = quote?.preco ?? holding.precoMedio;
          const variacao = quote?.variacao ?? 0;
          const valor = preco * holding.quantidade;
          const custo = holding.precoMedio * holding.quantidade;

          return {
            ...holding,
            preco,
            valor,
            custo,
            resultado: valor - custo,
            resultadoPercent: custo === 0 ? 0 : ((valor - custo) / custo) * 100,
            variacaoDia: variacao * holding.quantidade,
            variacaoDiaPercent: quote?.variacaoPercent ?? 0,
          } satisfies PortfolioPosition;
        }),
      );

      const series: Record<string, PricePoint[]> = { ...this._series() };
      for (const holding of this._holdings()) {
        if (!series[holding.ticker]) {
          series[holding.ticker] = await this.market.serie(holding.ticker, '3mo');
        }
      }
      this._series.set(series);
    } finally {
      this._carregando.set(false);
    }
  }

  recarregar(): Promise<void> {
    this.market.limparCache();
    return this.carregar(true);
  }
}
