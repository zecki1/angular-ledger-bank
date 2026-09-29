import { TestBed } from '@angular/core/testing';

import { PricePoint } from '../models';
import { MarketService, cotacaoDemo } from './market.service';
import { HOLDINGS_DEMO, PortfolioService } from './portfolio.service';

class MarketStub {
  limpo = 0;
  cotacoesPedidas = 0;
  chamadasConcurrentes = 0;
  maxConcorrente = 0;
  falhar = false;
  tickerErrado = false;

  async cotacao(ticker: string) {
    this.chamadasConcurrentes++;
    this.maxConcorrente = Math.max(this.maxConcorrente, this.chamadasConcurrentes);
    try {
      await Promise.resolve();
      if (this.falhar) throw new Error('sem rede');
      const quote = cotacaoDemo(this.tickerErrado ? 'ZZZZ11' : ticker);
      return { quote, origin: 'demo' as const };
    } finally {
      this.chamadasConcurrentes--;
    }
  }

  async cotacoes(tickers: readonly string[]) {
    this.cotacoesPedidas++;
    const saida: { quote: ReturnType<typeof cotacaoDemo>; origin: 'demo' }[] = [];
    for (const t of tickers) saida.push(await this.cotacao(t));
    return saida;
  }

  async serie(ticker: string): Promise<PricePoint[]> {
    const base = cotacaoDemo(ticker).preco;
    return Array.from({ length: 20 }, (_, i) => ({
      date: `2026-0${1 + Math.floor(i / 10)}-${String((i % 10) + 1).padStart(2, '0')}`,
      close: Number((base * (1 + i / 100)).toFixed(2)),
    }));
  }

  limparCache(): void {
    this.limpo++;
  }
}

describe('PortfolioService', () => {
  let portfolio: PortfolioService;
  let market: MarketStub;

  beforeEach(() => {
    market = new MarketStub();
    TestBed.configureTestingModule({
      providers: [{ provide: MarketService, useValue: market }],
    });
    portfolio = TestBed.inject(PortfolioService);
  });

  it('nasce sem posições até carregar', () => {
    expect(portfolio.posicoes()).toEqual([]);
    expect(portfolio.valorTotal()).toBe(0);
    expect(portfolio.maiorPosicao()).toBeNull();
    expect(portfolio.alocacao()).toEqual([]);
    expect(portfolio.performance()).toEqual([]);
  });

  it('expõe os tickers do seed na ordem do seed', () => {
    expect(portfolio.tickers()).toEqual(HOLDINGS_DEMO.map((h) => h.ticker));
  });

  it('monta uma posição por holding ao carregar', async () => {
    await portfolio.carregar();

    expect(portfolio.posicoes().length).toBe(HOLDINGS_DEMO.length);
    expect(portfolio.totalEmPosicoes()).toBe(HOLDINGS_DEMO.length);
    expect(market.cotacoesPedidas).toBe(1);
  });

  it('calcula custo, valor e resultado por posição', async () => {
    await portfolio.carregar();

    const holding = HOLDINGS_DEMO[0];
    const posicao = portfolio.posicoes()[0];
    const preco = cotacaoDemo(holding.ticker).preco;

    expect(posicao.custo).toBeCloseTo(holding.precoMedio * holding.quantidade, 6);
    expect(posicao.valor).toBeCloseTo(preco * holding.quantidade, 6);
    expect(posicao.resultado).toBeCloseTo(posicao.valor - posicao.custo, 6);
    expect(posicao.resultadoPercent).toBeCloseTo(
      (posicao.valor - posicao.custo) / posicao.custo * 100,
      6,
    );
  });

  it('agrega o total da carteira', async () => {
    await portfolio.carregar();

    const custo = portfolio.posicoes().reduce((s, p) => s + p.custo, 0);
    const valor = portfolio.posicoes().reduce((s, p) => s + p.valor, 0);

    expect(portfolio.custoTotal()).toBeCloseTo(custo, 6);
    expect(portfolio.valorTotal()).toBeCloseTo(valor, 6);
    expect(portfolio.resultadoAbsoluto()).toBeCloseTo(valor - custo, 6);
    expect(portfolio.resultadoPercent()).toBeCloseTo(((valor - custo) / custo) * 100, 6);
  });

  it('soma a variação do dia ponderada pela quantidade', async () => {
    await portfolio.carregar();

    const esperado = portfolio.posicoes().reduce((s, p) => s + p.variacaoDia, 0);
    expect(portfolio.variacaoDia()).toBeCloseTo(esperado, 6);
    expect(portfolio.variacaoDiaPercent()).toBeCloseTo(
      (portfolio.variacaoDia() / portfolio.valorTotal()) * 100,
      6,
    );
  });

  it('a alocação fecha em 100% e vem ordenada por valor', async () => {
    await portfolio.carregar();

    const fatias = portfolio.alocacao();
    expect(fatias.length).toBeGreaterThan(0);
    expect(fatias.reduce((s, f) => s + f.peso, 0)).toBeCloseTo(100, 6);
    for (let i = 1; i < fatias.length; i++) {
      expect(fatias[i - 1].valor).toBeGreaterThanOrEqual(fatias[i].valor);
    }
  });

  it('encontra a maior, a melhor e a pior posição', async () => {
    await portfolio.carregar();

    const lista = portfolio.posicoes();
    const maior = lista.reduce((a, b) => (b.valor > a.valor ? b : a));
    const melhor = lista.reduce((a, b) => (b.resultadoPercent > a.resultadoPercent ? b : a));
    const pior = lista.reduce((a, b) => (b.resultadoPercent < a.resultadoPercent ? b : a));

    expect(portfolio.maiorPosicao()?.ticker).toBe(maior.ticker);
    expect(portfolio.melhorPosicao()?.ticker).toBe(melhor.ticker);
    expect(portfolio.pioresPosicao()?.ticker).toBe(pior.ticker);
  });

  it('monta a curva da carteira em base 100', async () => {
    await portfolio.carregar();

    const curva = portfolio.performance();
    expect(curva.length).toBe(20);
    expect(curva[0].date).toBe('2026-01-01');
    for (const ponto of curva) {
      expect(Number.isFinite(ponto.close)).toBe(true);
      expect(ponto.close).toBeGreaterThan(0);
    }
  });

  it('ignora uma segunda carga concorrente', async () => {
    const primeira = portfolio.carregar();
    const segunda = portfolio.carregar();

    await Promise.all([primeira, segunda]);

    expect(market.cotacoesPedidas).toBe(1);
    expect(portfolio.carregando()).toBe(false);
  });

  it('recarregar limpa o cache do mercado e força a busca', async () => {
    await portfolio.carregar();
    const antes = market.cotacoesPedidas;

    await portfolio.recarregar();

    expect(market.limpo).toBe(1);
    expect(market.cotacoesPedidas).toBe(antes + 1);
  });

  it('cai no preço médio quando a API devolve outro ticker', async () => {
    // A BrAPI ecoa `symbol` do resultado; se vier um ticker diferente do
    // pedido, a posição não pode herdar o preço de outro ativo.
    market.tickerErrado = true;
    await portfolio.carregar();

    const holding = HOLDINGS_DEMO[0];
    const posicao = portfolio.posicoes()[0];

    expect(posicao.preco).toBe(holding.precoMedio);
    expect(posicao.valor).toBeCloseTo(holding.precoMedio * holding.quantidade, 6);
    expect(posicao.resultado).toBe(0);
    expect(posicao.variacaoDia).toBe(0);
  });

  it('libera o estado de carregamento mesmo quando a carga falha', async () => {
    market.falhar = true;
    await expect(portfolio.carregar()).rejects.toThrow('sem rede');
    expect(portfolio.carregando()).toBe(false);
  });
});
