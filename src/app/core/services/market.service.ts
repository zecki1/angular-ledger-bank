import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MarketRange, PricePoint, Quote, QuoteResult } from '../models';

/** Envelope padrão da API Java (`{ success, mensagem, data, count, timestamp }`). */
interface RespostaApi<T> {
  success: boolean;
  mensagem: string;
  data: T | null;
  count?: number;
  timestamp?: string;
}

/** Formato devolvido por `GET /api/mercado/series`. */
interface SerieApi {
  ticker: string;
  range: string;
  interval: string;
  pontos: PricePoint[];
}

const TTL_MS = 60_000;

interface CacheEntry {
  quote: Quote;
  lidoEm: number;
}

export const DEMO_TICKERS = ['PETR4', 'VALE3', 'ITSA4', 'B3SA3', 'WEGE3', 'MXRF11'] as const;

/**
 * Cliente de cotações do app, falando **só** com a API Java do banco.
 *
 * O navegador não chama mais a BrAPI direto. Motivos:
 *
 * 1. **CORS e token** — a BrAPI responde `401` sem token e não libera CORS para
 *    o domínio do app; a API Java resolve os dois do lado do servidor.
 * 2. **Segredo fora do frontend** — nenhuma credencial de terceiro chega ao
 *    navegador; o Java é o único que conversa com a fonte externa.
 * 3. **Lote de verdade** — o Java busca vários tickers numa requisição só, então
 *    não existe mais fila serial nem o limite de 20 req/min no cliente.
 *
 * O cache de 60s casa com o cache do próprio Java: a tela pode abrir quantas
 * vezes quiser que o custo externo é o mesmo. Quando a API falha (offline,
 * `success:false`, ticker inexistente) cai no seed determinístico e o `origin`
 * diz ao usuário se aquilo é ao vivo, cache ou demonstração.
 */
@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly cache = new Map<string, CacheEntry>();

  private readonly _quotes = signal<Record<string, QuoteResult>>({});
  private readonly _carregando = signal<Set<string>>(new Set());
  private readonly _erro = signal<string>('');
  private readonly _ultimaAtualizacao = signal<string>('');

  readonly quotes = this._quotes.asReadonly();
  readonly carregando = this._carregando.asReadonly();
  readonly erro = this._erro.asReadonly();
  readonly ultimaAtualizacao = this._ultimaAtualizacao.asReadonly();

  readonly algumAoVivo = computed(() =>
    Object.values(this._quotes()).some((r) => r.origin === 'ao_vivo'),
  );

  /** Cotação com cache; só vai à rede se o TTL venceu. */
  async cotacao(ticker: string, forcar = false): Promise<QuoteResult> {
    const [resultado] = await this.cotacoes([ticker], forcar);
    return resultado;
  }

  /**
   * Várias cotações numa requisição só. A ordem de saída é a de entrada, e cada
   * ticker cai no cache individualmente — pedir `[PETR4]` depois de
   * `[PETR4, VALE3]` só toca a rede se o cache tiver vencido.
   */
  async cotacoes(tickers: readonly string[], forcar = false): Promise<QuoteResult[]> {
    const simbolos = [...new Set(tickers.map(normalizarTicker).filter((t) => t.length > 0))];
    if (simbolos.length === 0) {
      return [];
    }

    const resultados = new Map<string, QuoteResult>();
    const paraBuscar: string[] = [];

    for (const simbolo of simbolos) {
      const existente = this.cache.get(simbolo);
      if (!forcar && existente && Date.now() - existente.lidoEm < TTL_MS) {
        resultados.set(simbolo, { quote: existente.quote, origin: 'cache' });
      } else {
        paraBuscar.push(simbolo);
      }
    }

    if (paraBuscar.length > 0) {
      this.marcarCarregando(paraBuscar, true);
      let erro = '';

      try {
        const encontradas = await this.buscarLote(paraBuscar);
        for (const simbolo of paraBuscar) {
          const quote = encontradas.get(simbolo);
          if (quote) {
            this.cache.set(simbolo, { quote, lidoEm: Date.now() });
            resultados.set(simbolo, { quote, origin: 'ao_vivo' });
          } else {
            // O Java devolveu lote sem este ticker: ele não falhou o lote todo.
            resultados.set(simbolo, this.fallbackDemo(simbolo));
            erro = erro || `Sem cotação para ${simbolo}`;
          }
        }
      } catch (falha) {
        erro = falha instanceof Error ? falha.message : 'Falha ao consultar cotações';
        for (const simbolo of paraBuscar) {
          resultados.set(simbolo, this.fallbackDemo(simbolo));
        }
      } finally {
        this.marcarCarregando(paraBuscar, false);
      }

      this._erro.set(erro);
    }

    const saida = simbolos.map((s) => resultados.get(s)).filter((r): r is QuoteResult => !!r);
    for (const resultado of saida) {
      this.registrar(resultado);
    }
    if (saida.some((r) => r.origin === 'ao_vivo')) {
      this._ultimaAtualizacao.set(new Date().toISOString());
    }
    return saida;
  }

  /** Série histórica para o sparkline/chart. Cai no seed se a API falhar. */
  async serie(ticker: string, range: MarketRange = '1mo'): Promise<PricePoint[]> {
    const simbolo = normalizarTicker(ticker);
    const url = `${this.base()}/api/mercado/series?ticker=${encodeURIComponent(simbolo)}&range=${range}&interval=1d`;

    try {
      const corpo = await this.get<SerieApi>(url);
      const pontos = corpo.data?.pontos ?? [];
      if (pontos.length > 0) {
        return pontos.map((p) => ({ date: String(p.date).slice(0, 10), close: p.close }));
      }
    } catch {
      // Série é um extra: a cotação principal já foi resolvida.
    }
    return serieDemo(simbolo, range);
  }

  limparCache(): void {
    this.cache.clear();
  }

  // ------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------

  private base(): string {
    return environment.apiBaseUrl.replace(/\/$/, '');
  }

  /** Lote de cotações; o Java já cuida do `.SA`, do cache e dos timeouts. */
  private async buscarLote(simbolos: readonly string[]): Promise<Map<string, Quote>> {
    const url = `${this.base()}/api/mercado/cotacoes?tickers=${encodeURIComponent(simbolos.join(','))}`;
    const corpo = await this.get<Quote[]>(url);
    return new Map((corpo.data ?? []).map((quote) => [normalizarTicker(quote.ticker), quote]));
  }

  /** GET na API Java, traduzindo o envelope e os erros para o domínio do app. */
  private async get<T>(url: string): Promise<RespostaApi<T>> {
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!resposta.ok) {
      throw new Error(`Cotação indisponível (${resposta.status})`);
    }

    const corpo = (await resposta.json()) as RespostaApi<T>;
    if (!corpo.success || corpo.data === null || corpo.data === undefined) {
      throw new Error(corpo.mensagem || 'A API não retornou cotações');
    }
    return corpo;
  }

  /** Guarda o seed no cache para não recomputar a cada tela. */
  private fallbackDemo(simbolo: string): QuoteResult {
    const quote = this.cache.get(simbolo)?.quote ?? cotacaoDemo(simbolo);
    this.cache.set(simbolo, { quote, lidoEm: Date.now() });
    return { quote, origin: 'demo' };
  }

  private registrar(resultado: QuoteResult): void {
    this._quotes.update((atual) => ({ ...atual, [resultado.quote.ticker]: resultado }));
  }

  private marcarCarregando(simbolos: readonly string[], ativo: boolean): void {
    this._carregando.update((atual) => {
      const proximo = new Set(atual);
      for (const simbolo of simbolos) {
        if (ativo) {
          proximo.add(simbolo);
        } else {
          proximo.delete(simbolo);
        }
      }
      return proximo;
    });
  }
}

/** `petr4`, ` petr4 ` e `PETR4` são o mesmo ativo. */
export function normalizarTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

/** Só letras e dígitos, 2 a 12 caracteres — o que a B3 aceita. */
export function tickerValido(ticker: string): boolean {
  return /^[A-Za-z0-9]{2,12}$/.test(ticker.trim());
}

/** PRNG determinístico: o mesmo ticker devolve sempre o mesmo valor. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10_000;
  return x - Math.floor(x);
}

function seedDoTicker(ticker: string): number {
  let soma = 0;
  for (let i = 0; i < ticker.length; i += 1) {
    soma += ticker.charCodeAt(i) * (i + 7);
  }
  return soma;
}

/** Seed local para quando a rede falha — mesma forma da resposta real. */
export function cotacaoDemo(ticker: string): Quote {
  const simbolo = normalizarTicker(ticker);
  const seed = seedDoTicker(simbolo);
  const base = 8 + pseudoRandom(seed) * 92;
  const variacaoPercent = (pseudoRandom(seed + 11) - 0.45) * 6;
  const variacao = (base * variacaoPercent) / 100;
  const abertura = base - variacao * 0.6;

  return {
    ticker: simbolo,
    nome: `${simbolo} (demonstração)`,
    preco: Number(base.toFixed(2)),
    variacao: Number(variacao.toFixed(2)),
    variacaoPercent: Number(variacaoPercent.toFixed(2)),
    moeda: 'BRL',
    abertura: Number(abertura.toFixed(2)),
    minima: Number((base * 0.97).toFixed(2)),
    maxima: Number((base * 1.03).toFixed(2)),
    volume: Math.round(1_000_000 + pseudoRandom(seed + 23) * 40_000_000),
    valorMercado: Math.round(base * 1_000_000_000 * (0.2 + pseudoRandom(seed + 31))),
    minimo52: Number((base * 0.62).toFixed(2)),
    maximo52: Number((base * 1.48).toFixed(2)),
    atualizadoEm: new Date().toISOString(),
    logoUrl: '',
  };
}

export function serieDemo(ticker: string, range: MarketRange = '1mo'): PricePoint[] {
  const pontos: Record<MarketRange, number> = { '1d': 24, '5d': 30, '1mo': 30, '3mo': 45, '1y': 52 };
  const total = pontos[range] ?? 30;
  const simbolo = normalizarTicker(ticker);
  const seed = seedDoTicker(simbolo);
  const base = 8 + pseudoRandom(seed) * 92;

  const hoje = new Date();
  return Array.from({ length: total }, (_, i) => {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() - (total - 1 - i));
    const ruido = (pseudoRandom(seed + i * 3) - 0.5) * 0.06;
    const tendencia = (i / total) * (pseudoRandom(seed + 101) - 0.4) * 0.3;
    return {
      date: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`,
      close: Number((base * (1 + ruido + tendencia)).toFixed(2)),
    };
  });
}
