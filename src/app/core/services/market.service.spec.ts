import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { QuoteResult } from '../models';
import {
  DEMO_TICKERS,
  MarketService,
  cotacaoDemo,
  normalizarTicker,
  serieDemo,
  tickerValido,
} from './market.service';

function brapiResult(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    symbol: 'PETR4',
    shortName: 'Petrobras PN',
    currency: 'BRL',
    regularMarketPrice: 38.5,
    regularMarketChange: -1.25,
    regularMarketChangePercent: -3.15,
    regularMarketOpen: 39.4,
    regularMarketDayLow: 38.1,
    regularMarketDayHigh: 39.8,
    regularMarketVolume: 12_345_678,
    marketCap: 241_000_000_000,
    logourl: 'https://brapi.dev/logo/petr4.png',
    ...over,
  };
}

/** `MarketService.get` devolve o corpo JSON já parseado. */
interface GetPrivado {
  get: (url: string) => Promise<unknown>;
}

function mockGet(servico: MarketService, corpo: unknown) {
  return vi
    .spyOn(servico as unknown as GetPrivado, 'get')
    .mockResolvedValue(corpo as never);
}

describe('normalizarTicker / tickerValido', () => {
  it('sobe o ticker, tira espaços e sufixos de B3', () => {
    expect(normalizarTicker(' petr4 ')).toBe('PETR4');
    expect(normalizarTicker('mxrf11')).toBe('MXRF11');
  });

  it('aceita apenas 2 a 12 letras ou dígitos', () => {
    expect(tickerValido('PETR4')).toBe(true);
    expect(tickerValido('A1')).toBe(true);
    expect(tickerValido('ABCDEFGHIJKL')).toBe(true);
    expect(tickerValido('A')).toBe(false);
    expect(tickerValido('ABCDEFGHIJKLM')).toBe(false);
    expect(tickerValido('PETR4!')).toBe(false);
    expect(tickerValido('PETR 4')).toBe(false);
  });
});

describe('seed determinístico (sem API)', () => {
  it('gera o mesmo preço para o mesmo ticker', () => {
    const a = cotacaoDemo('PETR4');
    const b = cotacaoDemo('PETR4');
    expect(a.preco).toBe(b.preco);
    expect(a.variacao).toBe(b.variacao);
  });

  it('gera valores diferentes para tickers diferentes', () => {
    expect(cotacaoDemo('PETR4').preco).not.toBe(cotacaoDemo('VALE3').preco);
  });

  it('mantém o preço positivo e a variação plausível', () => {
    for (const ticker of DEMO_TICKERS) {
      const q = cotacaoDemo(ticker);
      expect(q.preco).toBeGreaterThan(0);
      expect(Math.abs(q.variacaoPercent)).toBeLessThanOrEqual(20);
      expect(q.moeda).toBe('BRL');
    }
  });

  it('devolve uma série com a quantidade de pontos do período', () => {
    expect(serieDemo('PETR4', '1d').length).toBeGreaterThan(0);
    expect(serieDemo('PETR4', '1mo').length).toBeGreaterThan(0);
    expect(serieDemo('PETR4', '3mo').length).toBeGreaterThan(0);
    expect(serieDemo('PETR4', '1y').length).toBeGreaterThan(0);
  });

  it('mantém as datas da série em ordem e no formato YYYY-MM-DD', () => {
    const pontos = serieDemo('VALE3', '1mo');
    expect(pontos[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (let i = 1; i < pontos.length; i++) {
      expect(pontos[i].date >= pontos[i - 1].date).toBe(true);
    }
  });
});

describe('MarketService', () => {
  let servico: MarketService;

  beforeEach(() => {
    vi.restoreAllMocks();
    TestBed.configureTestingModule({});
    servico = TestBed.inject(MarketService);
  });

  afterEach(() => {
    servico.limparCache();
  });

  it('normaliza a resposta snake_case da BrAPI', async () => {
    const spy = mockGet(servico, { results: [brapiResult()] });

    const r: QuoteResult = await servico.cotacao('petr4');

    expect(r.origin).toBe('ao_vivo');
    expect(r.quote.ticker).toBe('PETR4');
    expect(r.quote.nome).toBe('Petrobras PN');
    expect(r.quote.preco).toBe(38.5);
    expect(r.quote.variacao).toBe(-1.25);
    expect(r.quote.variacaoPercent).toBe(-3.15);
    expect(r.quote.volume).toBe(12_345_678);
    expect(r.quote.valorMercado).toBe(241_000_000_000);
    expect(r.quote.logoUrl).toContain('petr4');
    expect(spy).toHaveBeenCalled();
  });

  it('usa o cache dentro do TTL e não vai à rede de novo', async () => {
    const spy = mockGet(servico, { results: [brapiResult()] });

    await servico.cotacao('PETR4');
    const segunda = await servico.cotacao('PETR4');

    expect(segunda.origin).toBe('cache');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('forcar=true ignora o cache', async () => {
    const spy = mockGet(servico, { results: [brapiResult()] });

    await servico.cotacao('PETR4');
    await servico.cotacao('PETR4', true);

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('cai no seed e marca demo quando a API falha', async () => {
    vi.spyOn(servico as unknown as GetPrivado, 'get').mockRejectedValue(new Error('offline'));

    const r = await servico.cotacao('PETR4');

    expect(r.origin).toBe('demo');
    expect(r.quote.preco).toBeGreaterThan(0);
    expect(servico.erro()).toBe('offline');
    expect(servico.algumAoVivo()).toBe(false);
  });

  it('trata results vazio como falha e não quebra', async () => {
    mockGet(servico, { results: [] });

    const r = await servico.cotacao('PETR4');
    expect(r.origin).toBe('demo');
  });

  it('limpa o erro depois de uma consulta bem-sucedida', async () => {
    vi.spyOn(servico as unknown as GetPrivado, 'get').mockRejectedValue(new Error('rate limit'));
    await servico.cotacao('PETR4');
    expect(servico.erro()).toBe('rate limit');

    mockGet(servico, { results: [brapiResult()] });
    await servico.cotacao('PETR4', true);
    expect(servico.erro()).toBe('');
  });

  it('serializa as chamadas: uma por vez, sem concorrência', async () => {
    let emVoo = 0;
    let maximoObservado = 0;
    const get = vi
      .spyOn(servico as unknown as GetPrivado, 'get')
      .mockImplementation(async () => {
        emVoo++;
        maximoObservado = Math.max(maximoObservado, emVoo);
        await new Promise((r) => setTimeout(r, 1));
        emVoo--;
        return { results: [brapiResult()] };
      });

    await servico.cotacoes(['PETR4', 'VALE3', 'ITSA4']);

    expect(get).toHaveBeenCalledTimes(3);
    expect(maximoObservado).toBe(1);
  });

  it('publica o estado no signal e marca carregando', async () => {
    mockGet(servico, { results: [brapiResult()] });

    const promessa = servico.cotacao('PETR4');
    expect(servico.carregando().has('PETR4')).toBe(true);
    await promessa;

    expect(servico.carregando().has('PETR4')).toBe(false);
    expect(servico.quotes()['PETR4']).toBeDefined();
    expect(servico.ultimaAtualizacao()).not.toBe('');
    expect(servico.algumAoVivo()).toBe(true);
  });

  it('limparCache esvazia o mapa interno', async () => {
    const get = mockGet(servico, { results: [brapiResult()] });

    await servico.cotacao('PETR4');
    servico.limparCache();
    await servico.cotacao('PETR4');

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('mapeia a série histórica da BrAPI para PricePoint', async () => {
    mockGet(servico, {
      results: [brapiResult({ historicalDataPrice: [{ date: 1750000000, close: 37.1 }] })],
    });

    const pontos = await servico.serie('PETR4', '1mo');
    expect(pontos).toEqual([{ date: '2025-06-15', close: 37.1 }]);
  });

  it('usa a série demo quando a API não devolve histórico', async () => {
    mockGet(servico, { results: [brapiResult({ historicalDataPrice: [] })] });

    const pontos = await servico.serie('PETR4', '1mo');
    expect(pontos.length).toBeGreaterThan(0);
    expect(pontos).toEqual(serieDemo('PETR4', '1mo'));
  });

  it('traduz 429 em mensagem de rate limit', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    const r = await servico.cotacao('PETR4', true);

    expect(r.origin).toBe('demo');
    expect(servico.erro()).toMatch(/Limite de consultas/i);
  });

  it('traduz erro do corpo da BrAPI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ error: true, message: 'Ticker inválido' }),
    } as unknown as Response);

    const r = await servico.cotacao('NAOEXISTE', true);

    expect(r.origin).toBe('demo');
    expect(servico.erro()).toBe('Ticker inválido');
  });

  it('monta a URL com a base da API e o token quando existir', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results: [brapiResult()] }),
    } as unknown as Response);

    await servico.cotacao('PETR4', true);

    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.pathname).toBe('/api/quote/PETR4');
    expect(url.searchParams.get('token')).toBe(environment.brapiToken || null);
  });
});
