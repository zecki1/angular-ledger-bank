import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { AuthService } from '../../../core/services/auth.service';
import { routes } from '../../../app.routes';
import { Shell } from './shell';

const spaces = (s: string): string => s.replace(/\u00a0/g, ' ');

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let auth: AuthService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Shell],
      // Rotas reais: o logout navega para /login e sem elas a navegação falha.
      providers: [provideRouter(routes)],
    }).compileComponents();
    auth = TestBed.inject(AuthService);
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('exibe identidade e saldo consolidado do usuário logado', () => {
    auth.loginDemo().subscribe();
    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const text = host().textContent ?? '';
    expect(text).toContain('Ledger');
    expect(text).toContain('Usuário Demo');
    expect(spaces(text)).toContain('user@demo.dev');
    expect(spaces(text)).toContain('R$ 33.583,75');
  });

  it('mostra os itens de navegação protegidos', () => {
    auth.loginDemo().subscribe();
    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const text = host().textContent ?? '';
    expect(text).toContain('Dashboard');
    expect(text).toContain('Transações');
  });

  it('desloga ao clicar em Sair', () => {
    auth.loginDemo().subscribe();
    fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();

    const sair = [...host().querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('Sair'),
    );
    sair?.click();

    expect(auth.isAuthenticated()).toBe(false);
  });
});