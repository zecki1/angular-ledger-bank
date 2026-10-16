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

  describe('menu do mobile (hambúrguer)', () => {
    const botaoMenu = (): HTMLButtonElement | null =>
      host().querySelector<HTMLButtonElement>('[aria-controls="menu-mobile"]');

    const gaveta = (): HTMLElement | null => host().querySelector('#menu-mobile');

    beforeEach(() => {
      auth.loginDemo().subscribe();
      fixture = TestBed.createComponent(Shell);
      fixture.detectChanges();
    });

    it('começa fechada, fora de foco e fora de leitura', () => {
      expect(botaoMenu()).not.toBeNull();
      expect(botaoMenu()?.getAttribute('aria-expanded')).toBe('false');
      // `inert` tira a gaveta fechada da ordem de tabulação e da árvore de
      // acessibilidade — sem isso os links escondidos continuariam alcançáveis.
      expect(gaveta()?.hasAttribute('inert')).toBe(true);
    });

    it('abre e fecha pelo próprio botão', () => {
      botaoMenu()?.click();
      fixture.detectChanges();

      expect(botaoMenu()?.getAttribute('aria-expanded')).toBe('true');
      expect(gaveta()?.hasAttribute('inert')).toBe(false);
      expect(gaveta()?.classList.contains('aberto')).toBe(true);

      botaoMenu()?.click();
      fixture.detectChanges();

      expect(botaoMenu()?.getAttribute('aria-expanded')).toBe('false');
      expect(gaveta()?.hasAttribute('inert')).toBe(true);
      expect(gaveta()?.classList.contains('aberto')).toBe(false);
    });

    it('fecha com Escape', () => {
      botaoMenu()?.click();
      fixture.detectChanges();

      // O Angular casa eventos de teclado pelo `keyCode`, não pelo `key` — em
      // um evento sintético ele vem como 0 e o handler simplesmente não roda.
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, which: 27, bubbles: true }),
      );
      fixture.detectChanges();

      expect(botaoMenu()?.getAttribute('aria-expanded')).toBe('false');
    });

    it('fecha ao clicar no fundo escurecido', () => {
      botaoMenu()?.click();
      fixture.detectChanges();

      host().querySelector('.menu-fundo')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(botaoMenu()?.getAttribute('aria-expanded')).toBe('false');
    });

    it('mantém os itens de navegação no menu aberto', () => {
      botaoMenu()?.click();
      fixture.detectChanges();

      const texto = gaveta()?.textContent ?? '';
      expect(texto).toContain('Dashboard');
      expect(texto).toContain('Transações');
      expect(texto).toContain('Configurações');
    });
  });
});