import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { IntegrationsService } from '../../../core/services/integrations.service';
import { ConnectionsPage } from './connections-page';

describe('ConnectionsPage', () => {
  let fixture: ComponentFixture<ConnectionsPage>;
  let host: HTMLElement;
  let integracoes: IntegrationsService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [ConnectionsPage] }).compileComponents();

    fixture = TestBed.createComponent(ConnectionsPage);
    integracoes = TestBed.inject(IntegrationsService);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('começa sem integrações conectadas no modo demo', () => {
    expect(host.querySelector('[data-testid="total-conectadas"]')?.textContent?.trim()).toBe('0');
    expect(host.textContent).toContain('Nenhuma integração ativa');
    expect(host.querySelector('[data-testid="ambiente-supabase"]')?.textContent).toContain('inativa');
  });

  it('lista as integrações disponíveis com botão de conectar', () => {
    const disponiveis = host.querySelector('[data-testid="lista-disponiveis"]');
    expect(disponiveis).not.toBeNull();
    // o Supabase não entra: é gerenciado pelo ambiente
    expect(disponiveis?.querySelectorAll('button').length).toBe(5);
  });

  it('mostra o Supabase em seção própria, sem botão de conectar', () => {
    const ambiente = host.querySelector('[data-testid="ambiente-supabase"]');
    expect(ambiente).not.toBeNull();
    expect(ambiente?.querySelector('button')).toBeNull();
    expect(host.querySelector('[data-testid="conectar-supabase"]')).toBeNull();
    expect(ambiente?.textContent).toContain('VITE_SUPABASE_URL');
  });

  it('conectar move a integração para a lista de conectadas', () => {
    const botao = host.querySelector<HTMLButtonElement>('[data-testid="conectar-brapi"]');
    expect(botao).not.toBeNull();

    botao?.click();
    fixture.detectChanges();

    expect(integracoes.isConectada('brapi')).toBe(true);
    expect(host.querySelector('[data-testid="total-conectadas"]')?.textContent?.trim()).toBe('1');
    expect(host.textContent).toContain('BrAPI');
  });

  it('exige login externo nas integrações que precisam', () => {
    expect(host.textContent).toContain('requer login');
    // apenas B3, Tesouro Direto e Binance
    expect(host.querySelectorAll('span').length).toBeGreaterThan(0);
    expect([...host.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual([
      'Supabase',
      'BrAPI',
      'B3 / BOVESPA',
      'Tesouro Direto',
      'Binance',
      'Microsoft Clarity',
    ]);
  });

  it('avisa que nenhuma credencial fica no app', () => {
    expect(host.textContent).toContain('não guardam senha nem token');
  });
});
