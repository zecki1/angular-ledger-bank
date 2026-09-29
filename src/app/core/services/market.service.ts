import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { MarketRange, PricePoint, Quote, QuoteResult } from '../models';

/** Resposta crua da BrAPI (o retorno real é snake_case). */
interface BrapiResult {
  symbol?: string;
  longName?: string;
  shortName?: string;
  currency?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketOpen?: number;
  regularMarketDayLow?: number;
  regularMarketDayHigh?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  regularMarketTime?: string;
  logourl?: string;
  historicalDataPrice?: { date: number; close: number }[];
}

const TTL_MS = 60_000;
const ESPACO_ENTRE_REQUISICOES_MS = 350;

interface CacheEntry {
  quote: Quote;
  lidoEm: number;
}

export const DEMO_TICKERS = ['PETR4', 'VALE3', 'ITSA4', 'B3SA3', 'WEGE3', 'MXRF11'] as const;

/**
 * Cliente de cotações da BrAPI (brapi.dev).
 *
 * Três restrições reais da API moldaram este serviço:
 *
 * 1. **Um ticker por requisição** sem token (lote responde `MISSING_TOKEN`), e
 *    a fila é estritamente serial — o header `x-brapi-concurrency-limit` é 1.
 * 2. **20 requisições por minuto** sem token. Por isso existe cache com TTL e
 *    um espaçador entre chamadas: abrir a tela doze vezes não pode virar um
 *    burst de doze requests.
 * 3. **CORS liberado** (`access-control-allow-origin: *`), então nada de proxy.
 *
 * Quando a chamada falha (offline, rate limit, ticker inexistente) o serviço
 * cai num seed determinístico: a tela nunca fica vazia nem trava, e o
 * `origin` da resposta diz ao usuário se aquilo é ao vivo ou demonstração.
 */
@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly cache = new Map<string, CacheEntry>();
  private fila: Promise<unknown> = Promise.resolve();
  private ultimoChamadoEm = 0;

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

  private readonly emVoo = new Set<string>();

  /** Cotação com cache; só vai à rede se o TTL venceu. */
  async cotacao(ticker: string, forcar = false): Promise<QuoteResult> {
    const simbolo = normalizarTicker(ticker);
    const existente = this.cache.get(simbolo);

    if (!forcar && existente && Date.now() - existente.lidoEm < TTL_MS) {
      return { quote: existente.quote, origin: 'cache' };
    }
    if (this.emVoo.has(simbolo)) {
      const atual = this._quotes()[simbolo];
      if (atual) return atual;
    }

    this.emVoo.add(simbolo);
    this.marcarCarregando(simbolo, true);

    try {
      const quote = await this.enfileirar(() => this.buscar(simbolo));
      this.cache.set(simbolo, { quote, lidoEm: Date.now() });
      this.registrar({ quote, origin: 'ao_vivo' });
      this._erro.set('');
      this._ultimaAtualizacao.set(new Date().toISOString());
      return { quote, origin: 'ao_vivo' };
    } catch (erro) {
      const message = erro instanceof Error ? erro.message : 'Falha ao consultar cotação';
      this._erro.set(message);
      const quote = this.cache.get(simbolo)?.quote ?? cotacaoDemo(simbolo);
      this.cache.set(simbolo, { quote, lidoEm: Date.now() });
      this.registrar({ quote, origin: 'demo' });
      return { quote, origin: 'demo' };
    } finally {
      this.emVoo.delete(simbolo);
      this.marcarCarregando(simbolo, false);
    }
  }

  /** Várias cotações em série (a API não faz lote sem token). */
  async cotacoes(tickers: readonly string[], forcar = false): Promise<QuoteResult[]> {
    const resultados: QuoteResult[] = [];
    for (const ticker of tickers) {
      resultados.push(await this.cotacao(ticker, forcar));
    }
    return resultados;
  }

  /** Série histórica para o sparkline/chart. Cai no seed se a API falhar. */
  async serie(ticker: string, range: MarketRange = '1mo'): Promise<PricePoint[]> {
    const simbolo = normalizarTicker(ticker);
    const url = this.montarUrl(`/quote/${encodeURIComponent(simbolo)}?range=${range}&interval=1d`);

    try {
      const bruto = await this.enfileirar(() => this.get(url));
      const resultado = (bruto as { results?: BrapiResult[] }).results?.[0];
      const serie = resultado?.historicalDataPrice ?? [];
      if (serie.length > 0) {
        return serie.map((p) => ({ date: new Date(p.date * 1000).toISOString().slice(0, 10), close: p.close }));
      }
    } catch {
      // série é um extra: a cotação principal já foi resolvida
    }
    return serieDemo(simbolo, range);
  }

  limparCache(): void {
    this.cache.clear();
  }

  /**
   * Serializa as chamadas. A BrAPI só aceita uma requisição por vez
   * (`x-brapi-concurrency-limit: 1`) e sem token são 20 por minuto — disparar
   * N tickers em paralelo toma 429 na cara do usuário.
   */
  private enfileirar<T>(tarefa: () => Promise<T>): Promise<T> {
    const proxima = this.fila.then(async () => {
      const espera = ESPACO_ENTRE_REQUISICOES_MS - (Date.now() - this.ultimoChamadoEm);
      if (espera > 0) {
        await new Promise((r) => setTimeout(r, espera));
      }
      this.ultimoChamadoEm = Date.now();
      return tarefa();
    });
    // A fila não pode morrer por causa de uma requisição anterior.
    this.fila = proxima.catch(() => undefined);
    return proxima;
  }

  private montarUrl(caminho: string): string {
    const base = environment.brapiBaseUrl.replace(/\/$/, '');
    const token = environment.brapiToken;
    const sep = caminho.includes('?') ? '&' : '?';
    return `${base}${caminho}${token ? `${sep}token=${encodeURIComponent(token)}` : ''}`;
  }

  private async buscar(simbolo: string): Promise<Quote> {
    // Sem token a API recusa lote, então é sempre um por vez.
    const url = this.montarUrl(`/quote/${encodeURIComponent(simbolo)}`);
    const bruto = await this.get(url);
    const resultado = (bruto as { results?: BrapiResult[] }).results?.[0];

    if (!resultado || typeof resultado.regularMarketPrice !== 'number') {
      throw new Error(`Sem cotação para ${simbolo}`);
    }
    return normalizar(resultado);
  }

  private async get(url: string): Promise<unknown> {
    const resposta = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!resposta.ok) {
      if (resposta.status === 429) {
        throw new Error('Limite de consultas atingido. Tente de novo em instantes.');
      }
      throw new Error(`Cotação indisponível (${resposta.status})`);
    }

    const corpo = (await resposta.json()) as { error?: boolean; message?: string };
    if (corpo.error) {
      throw new Error(corpo.message || 'A API recusou a consulta');
    }
    return corpo;
  }

  private registrar(resultado: QuoteResult): void {
    this._quotes.update((atual) => ({ ...atual, [resultado.quote.ticker]: resultado }));
  }

  private marcarCarregando(ticker: string, ativo: boolean): void {
    this._carregando.update((atual) => {
      const proximo = new Set(atual);
      if (ativo) {
        proximo.add(ticker);
      } else {
        proximo.delete(ticker);
      }
      return proximo;
    });
  }
}

/** `petr4`, ` petr4 ` e `PETR4` são o mesmo ativo. */
export function normalizarTicker(ticker: string): string {
  return ticker.trim().toUpperCase();
}

/** Só letras e dígitos, 2 a 12 caracteres — o que a BrAPI aceita. */
export function tickerValido(ticker: string): boolean {
  return /^[A-Za-z0-9]{2,12}$/.test(ticker.trim());
}

function normalizar(r: BrapiResult): Quote {
  const preco = r.regularMarketPrice as number;
  return {
    ticker: r.symbol ?? '—',
    nome: r.longName || r.shortName || r.symbol || '—',
    preco,
    variacao: r.regularMarketChange ?? 0,
    variacaoPercent: r.regularMarketChangePercent ?? 0,
    moeda: r.currency ?? 'BRL',
    abertura: r.regularMarketOpen ?? preco,
    minima: r.regularMarketDayLow ?? preco,
    maxima: r.regularMarketDayHigh ?? preco,
    volume: r.regularMarketVolume ?? 0,
    valorMercado: r.marketCap ?? 0,
    minimo52: r.fiftyTwoWeekLow ?? 0,
    maximo52: r.fiftyTwoWeekHigh ?? 0,
    atualizadoEm: r.regularMarketTime ?? new Date().toISOString(),
    logoUrl: r.logourl ?? '',
  };
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
