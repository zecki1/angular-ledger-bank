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

/** Uma `Cotacao` no formato exato que a API Java devolve. */
function cotacaoApi(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ticker: 'PETR4',
    nome: 'Petróleo Brasileiro S.A.',
    preco: 38.5,
    variacao: -1.25,
    variacaoPercent: -3.15,
    moeda: 'BRL',
    abertura: 39.4,
    minima: 38.1,
    maxima: 39.8,
    volume: 12_345_678,
    valorMercado: 241_000_000_000,
    minimo52: 27.1,
    maximo52: 44.9,
    atualizadoEm: '2026-09-30T18:00:00-03:00',
    logoUrl: '',
    ...over,
  };
}

/** Envelope de sucesso da API Java. */
function envelope<T>(data: T, count = Array.isArray(data) ? data.length : undefined) {
  return { success: true, mensagem: 'ok', data, count, timestamp: '2026-09-30T18:00:00Z' };
}

function mockFetch(payload: unknown, ok = true, status = 200) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(payload),
  } as unknown as Response);
}

describe('normalizarTicker / tickerValido', () => {
  it('sobe o ticker e tira espaços', () => {
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

  it('lê a cotação do envelope da API Java', async () => {
    const fetchSpy = mockFetch(envelope([cotacaoApi()]));

    const r: QuoteResult = await servico.cotacao('petr4');

    expect(r.origin).toBe('ao_vivo');
    expect(r.quote.ticker).toBe('PETR4');
    expect(r.quote.nome).toBe('Petróleo Brasileiro S.A.');
    expect(r.quote.preco).toBe(38.5);
    expect(r.quote.variacao).toBe(-1.25);
    expect(r.quote.variacaoPercent).toBe(-3.15);
    expect(r.quote.volume).toBe(12_345_678);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('chama a API Java, não a BrAPI', async () => {
    const fetchSpy = mockFetch(envelope([cotacaoApi()]));

    await servico.cotacao('PETR4', true);

    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.origin).toBe(new URL(environment.apiBaseUrl).origin);
    expect(url.pathname).toBe('/api/mercado/cotacoes');
    expect(url.searchParams.get('tickers')).toBe('PETR4');
  });

  it('usa o cache dentro do TTL e não vai à rede de novo', async () => {
    const fetchSpy = mockFetch(envelope([cotacaoApi()]));

    await servico.cotacao('PETR4');
    const segunda = await servico.cotacao('PETR4');

    expect(segunda.origin).toBe('cache');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('forcar=true ignora o cache', async () => {
    const fetchSpy = mockFetch(envelope([cotacaoApi()]));

    await servico.cotacao('PETR4');
    await servico.cotacao('PETR4', true);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('busca vários tickers numa requisição só', async () => {
    const fetchSpy = mockFetch(
      envelope([cotacaoApi({ ticker: 'PETR4' }), cotacaoApi({ ticker: 'VALE3', preco: 62 })]),
    );

    const resultados = await servico.cotacoes(['PETR4', 'VALE3']);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = new URL(fetchSpy.mock.calls[0][0] as string);
    expect(url.searchParams.get('tickers')).toBe('PETR4,VALE3');
    expect(resultados.map((r) => r.quote.ticker)).toEqual(['PETR4', 'VALE3']);
    expect(resultados.every((r) => r.origin === 'ao_vivo')).toBe(true);
  });

  it('ticker ausente no lote cai no seed sem derrubar os outros', async () => {
    mockFetch(envelope([cotacaoApi({ ticker: 'PETR4' })]));

    const resultados = await servico.cotacoes(['PETR4', 'VALE3']);
    const porTicker = new Map(resultados.map((r) => [r.quote.ticker, r]));

    expect(porTicker.get('PETR4')?.origin).toBe('ao_vivo');
    expect(porTicker.get('VALE3')?.origin).toBe('demo');
    expect(servico.erro()).toMatch(/VALE3/);
  });

  it('cai no seed e marca demo quando a rede falha', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const r = await servico.cotacao('PETR4');

    expect(r.origin).toBe('demo');
    expect(r.quote.preco).toBeGreaterThan(0);
    expect(servico.erro()).toBe('offline');
    expect(servico.algumAoVivo()).toBe(false);
  });

  it('trata success:false como falha e não quebra', async () => {
    mockFetch({ success: false, mensagem: 'Nenhuma cotação disponível', data: null });

    const r = await servico.cotacao('PETR4');

    expect(r.origin).toBe('demo');
    expect(servico.erro()).toBe('Nenhuma cotação disponível');
  });

  it('limpa o erro depois de uma consulta bem-sucedida', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('deu ruim'));
    await servico.cotacao('PETR4');
    expect(servico.erro()).toBe('deu ruim');

    mockFetch(envelope([cotacaoApi()]));
    await servico.cotacao('PETR4', true);
    expect(servico.erro()).toBe('');
  });

  it('publica o estado no signal e marca carregando', async () => {
    mockFetch(envelope([cotacaoApi()]));

    const promessa = servico.cotacao('PETR4');
    expect(servico.carregando().has('PETR4')).toBe(true);
    await promessa;

    expect(servico.carregando().has('PETR4')).toBe(false);
    expect(servico.quotes()['PETR4']).toBeDefined();
    expect(servico.ultimaAtualizacao()).not.toBe('');
    expect(servico.algumAoVivo()).toBe(true);
  });

  it('limparCache esvazia o mapa interno', async () => {
    const fetchSpy = mockFetch(envelope([cotacaoApi()]));

    await servico.cotacao('PETR4');
    servico.limparCache();
    await servico.cotacao('PETR4');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('mapeia os pontos da série da API Java', async () => {
    mockFetch(
      envelope({
        ticker: 'PETR4',
        range: '1mo',
        interval: '1d',
        pontos: [{ date: '2026-09-29', close: 37.1 }],
      }),
    );

    const pontos = await servico.serie('PETR4', '1mo');

    expect(pontos).toEqual([{ date: '2026-09-29', close: 37.1 }]);
  });

  it('usa a série demo quando a API não devolve pontos', async () => {
    mockFetch(envelope({ ticker: 'PETR4', range: '1mo', interval: '1d', pontos: [] }));

    const pontos = await servico.serie('PETR4', '1mo');

    expect(pontos).toEqual(serieDemo('PETR4', '1mo'));
  });

  it('traduz status HTTP de erro em mensagem legível', async () => {
    mockFetch({}, false, 503);

    const r = await servico.cotacao('PETR4', true);

    expect(r.origin).toBe('demo');
    expect(servico.erro()).toMatch(/503/);
  });
});
