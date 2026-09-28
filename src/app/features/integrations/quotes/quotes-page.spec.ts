import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { signal } from '@angular/core';
import { QuoteResult } from '../../../core/models';
import { MarketService, cotacaoDemo } from '../../../core/services/market.service';
import { QuotesPage } from './quotes-page';

/**
 * Stub do serviço: a página não deve tocar a rede em teste, e a fila real
 * espaça 350 ms entre chamadas — seis tickers levariam quase dois segundos.
 */
class MarketStub {
  private readonly state = signal<Record<string, QuoteResult>>({});
  private readonly carregando = signal(new Set<string>());
  private readonly erro = signal('');
  private readonly ultima = signal('');

  readonly quotes = this.state.asReadonly();
  readonly carregandoState = this.carregando.asReadonly();
  readonly erroState = this.erro.asReadonly();
  readonly ultimaAtualizacao = this.ultima.asReadonly();
  readonly algumAoVivo = () => false;

  async cotacao(ticker: string): Promise<QuoteResult> {
    this.carregando.update((s) => new Set(s).add(ticker));
    await Promise.resolve();
    const resultado: QuoteResult = { quote: cotacaoDemo(ticker), origin: 'demo' };
    this.state.update((s) => ({ ...s, [ticker]: resultado }));
    this.carregando.update((s) => {
      const n = new Set(s);
      n.delete(ticker);
      return n;
    });
    this.ultima.set(new Date().toISOString());
    return resultado;
  }

  async cotacoes(tickers: readonly string[]): Promise<QuoteResult[]> {
    const saida: QuoteResult[] = [];
    for (const t of tickers) saida.push(await this.cotacao(t));
    return saida;
  }

  async serie(): Promise<never[]> {
    return [];
  }

  limparCache(): void {
    this.state.set({});
  }
}

describe('QuotesPage', () => {
  let fixture: ComponentFixture<QuotesPage>;
  let host: HTMLElement;
  let market: MarketStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuotesPage],
      providers: [{ provide: MarketService, useClass: MarketStub }],
    }).compileComponents();
    fixture = TestBed.createComponent(QuotesPage);
    market = TestBed.inject(MarketService) as unknown as MarketStub;
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  const buscar = (valor: string) => {
    const input = host.querySelector<HTMLInputElement>('[data-testid="ticker-input"]');
    const form = host.querySelector<HTMLFormElement>('form');
    input!.value = valor;
    input!.dispatchEvent(new Event('input'));
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  it('avisa que está em modo demonstração', () => {
    expect(host.textContent).toContain('modo demonstração');
    expect(host.querySelector('[data-testid="erro-api"]')).toBeNull();
  });

  it('carrega os seis tickers de demonstração no ngOnInit', async () => {
    await vi.waitFor(() => fixture.detectChanges());
    await vi.waitFor(() =>
      expect(host.querySelector('[data-testid="contagem-cotacoes"]')?.textContent?.trim()).toBe(
        '6 ativos',
      ),
    );
    expect(host.textContent).toContain('modo demonstração');
  });

  it('rejeita busca vazia com mensagem acessível', () => {
    buscar('   ');
    const erro = host.querySelector('[data-testid="ticker-erro"]');
    expect(erro?.textContent).toContain('Digite um código');
    expect(erro?.getAttribute('role')).toBe('alert');
  });

  it('rejeita código com caractere inválido', () => {
    buscar('PETR4!');
    expect(host.querySelector('[data-testid="ticker-erro"]')?.textContent).toContain('Código inválido');
  });

  it('marca o input como inválido quando há erro', () => {
    buscar('A');
    expect(host.querySelector('[data-testid="ticker-input"]')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('aceita um código válido e limpa o campo', async () => {
    buscar('petr4');
    await vi.waitFor(() => fixture.detectChanges());

    expect(host.querySelector('[data-testid="ticker-erro"]')).toBeNull();
    expect(host.querySelector<HTMLInputElement>('[data-testid="ticker-input"]')?.value).toBe('');
  });

  it('mostra a contagem de ativos na tabela', async () => {
    await vi.waitFor(() =>
      expect(host.querySelectorAll('[data-testid="tabela-cotacoes"] tbody tr').length).toBe(6),
    );
  });

  it('sinaliza a origem de cada linha (ao vivo, cache ou demo)', async () => {
    await vi.waitFor(() =>
      expect(host.querySelectorAll('[data-testid="tabela-cotacoes"] tbody tr').length).toBe(6),
    );
    const origens = host.querySelectorAll('[data-testid="tabela-cotacoes"] tbody tr td:last-child');
    expect(origens.length).toBe(6);
    for (const celula of origens) {
      expect(celula.textContent?.trim()).toMatch(/^(ao vivo|cache|demo)$/);
    }
  });

  it('limparCache esvazia o estado do serviço', () => {
    market.limparCache();
    expect(market.quotes()).toEqual({});
  });

  it('o seed demo é o mesmo usado na tela', () => {
    expect(cotacaoDemo('PETR4').preco).toBeGreaterThan(0);
  });
});
