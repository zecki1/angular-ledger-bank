import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MarketRange, PricePoint } from '../../../core/models';
import { MarketService, cotacaoDemo } from '../../../core/services/market.service';
import { InvestmentsPage } from './investments-page';

class MarketStub {
  readonly rangesPedidos: MarketRange[] = [];
  readonly cotacoesPedidas: string[][] = [];
  limpezas = 0;
  readonly erro = signal('');
  /** O stub nunca devolve origem `ao_vivo`: serve para checar o aviso de demo. */
  readonly algumAoVivo = signal(false);

  async cotacao(ticker: string) {
    return { quote: cotacaoDemo(ticker), origin: 'demo' as const };
  }

  async cotacoes(tickers: readonly string[]) {
    this.cotacoesPedidas.push([...tickers]);
    const saida = [];
    for (const t of tickers) saida.push(await this.cotacao(t));
    return saida;
  }

  async serie(ticker: string, range: MarketRange = '1mo'): Promise<PricePoint[]> {
    this.rangesPedidos.push(range);
    const base = cotacaoDemo(ticker).preco;
    return Array.from({ length: 10 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      close: base + i,
    }));
  }

  limparCache(): void {
    this.limpezas++;
  }
}

describe('InvestmentsPage', () => {
  let fixture: ComponentFixture<InvestmentsPage>;
  let host: HTMLElement;
  let market: MarketStub;

  beforeEach(async () => {
    market = new MarketStub();
    await TestBed.configureTestingModule({
      imports: [InvestmentsPage],
      providers: [{ provide: MarketService, useValue: market }],
    }).compileComponents();

    fixture = TestBed.createComponent(InvestmentsPage);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;

    // o ngOnInit dispara a carga; esperar ela terminar evita asserções em cima
    // do estado "carregando" e não mede nada
    await vi.waitFor(() =>
      expect(
        host.querySelector<HTMLButtonElement>('[data-testid="recarregar-cotacoes"]')?.disabled,
      ).toBe(false),
    );
    fixture.detectChanges();
  });

  it('lista todas as posições do seed', () => {
    const linhas = host.querySelectorAll('[data-testid="tabela-posicoes"] tbody tr');
    expect(linhas.length).toBe(6);
  });

  it('mostra os quatro indicadores de carteira', () => {
    const cartoes = host.querySelectorAll('article');
    const texto = [...cartoes].map((c) => c.textContent).join(' | ');

    expect(texto).toContain('Valor de mercado');
    expect(texto).toContain('Custo total');
    expect(texto).toContain('Maior posição');
    expect(texto).toContain('Destaques');
  });

  it('oferece o filtro de classe com "Todas" por padrão', () => {
    const botoes = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Filtrar por classe de ativo"] button')];
    const rotulos = botoes.map((b) => b.textContent?.trim());

    expect(rotulos).toEqual(['Todas', 'Ações', 'Fundos imobiliários']);
  });

  it('filtra a tabela ao escolher uma classe', () => {
    const botoes = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Filtrar por classe de ativo"] button')];
    const fii = botoes.find((b) => b.textContent?.includes('Fundos'))!;
    fii.click();
    fixture.detectChanges();

    const linhas = host.querySelectorAll('[data-testid="tabela-posicoes"] tbody tr');
    expect(linhas.length).toBe(1);
    expect(linhas[0].textContent).toContain('MXRF11');
    expect(fii.getAttribute('aria-pressed')).toBe('true');
  });

  it('volta para todas as posições ao clicar em "Todas"', () => {
    const botoes = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Filtrar por classe de ativo"] button')];
    botoes.find((b) => b.textContent?.includes('Fundos'))!.click();
    fixture.detectChanges();
    botoes.find((b) => b.textContent?.trim() === 'Todas')!.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('[data-testid="tabela-posicoes"] tbody tr').length).toBe(6);
  });

  it('oferece os cinco períodos do gráfico', () => {
    const botoes = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Período do gráfico"] button')];
    expect(botoes.map((b) => b.textContent?.trim())).toEqual([
      '1 dia',
      '5 dias',
      '1 mês',
      '3 meses',
      '1 ano',
    ]);
  });

  it('marca 3 meses como período inicial', () => {
    const ativo = host.querySelector('[aria-label="Período do gráfico"] button[aria-pressed="true"]');
    expect(ativo?.textContent?.trim()).toBe('3 meses');
  });

  it('pede a série novamente ao trocar o período', async () => {
    const antes = market.rangesPedidos.length;
    const botoes = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Período do gráfico"] button')];
    botoes.find((b) => b.textContent?.trim() === '1 ano')!.click();

    await vi.waitFor(() => expect(market.rangesPedidos.length).toBeGreaterThan(antes));
    expect(market.rangesPedidos.at(-1)).toBe('1y');
    fixture.detectChanges();

    const ativo = host.querySelector('[aria-label="Período do gráfico"] button[aria-pressed="true"]');
    expect(ativo?.textContent?.trim()).toBe('1 ano');
  });

  it('o botão de recarregar chama o mercado de novo', async () => {
    const botao = host.querySelector<HTMLButtonElement>('[data-testid="recarregar-cotacoes"]');
    const chamadasAntes = market.cotacoesPedidas.length;
    const limpezasAntes = market.limpezas;

    botao?.click();
    await vi.waitFor(() => expect(market.limpezas).toBe(limpezasAntes + 1));
    await vi.waitFor(() => expect(market.cotacoesPedidas.length).toBeGreaterThan(chamadasAntes));
    // e só volta a habilitar quando a recarga termina
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(botao?.disabled).toBe(false);
    });

    expect(botao?.textContent?.trim()).toBe('Atualizar cotações');
  });

  it('declara a origem dos dados no subtítulo do gráfico', () => {
    // o stub nunca retorna origem ao vivo, então o app tem que avisar
    expect(host.textContent).toContain('seed local');
  });
});
