import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { DashboardPage } from './dashboard-page';

const spaces = (s: string): string => s.replace(/\u00a0/g, ' ');

describe('DashboardPage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    }).compileComponents();
    TestBed.inject(AuthService).loginDemo().subscribe();
  });

  const create = (): ComponentFixture<DashboardPage> => {
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    return fixture;
  };

  it('cumprimenta o usuário e mostra o saldo consolidado', () => {
    const text = create().nativeElement.textContent ?? '';
    expect(text).toContain('Olá, Usuário Demo');
    expect(spaces(text)).toContain('R$ 33.583,75');
  });

  it('lista os cards de saldo por conta', () => {
    const text = spaces(create().nativeElement.textContent ?? '');
    expect(text).toContain('Conta Corrente');
    expect(text).toContain('Poupança');
    expect(text).toContain('Cartão de Crédito');
    expect(text).toContain('R$ 8.432,70');
    expect(text).toContain('R$ 23.910,15');
  });

  it('renderiza o gráfico e as seções de fluxo e recentes', () => {
    const host = create().nativeElement as HTMLElement;
    expect(host.textContent).toContain('Fluxo de caixa');
    expect(host.textContent).toContain('Últimas transações');
    expect(host.querySelector('[role="img"]')?.getAttribute('aria-label')).toContain(
      'Gráfico de fluxo de caixa',
    );
  });

  it('mostra as transações mais recentes', () => {
    const text = create().nativeElement.textContent ?? '';
    expect(text).toContain('Ifood — almoço de hoje');
  });
});