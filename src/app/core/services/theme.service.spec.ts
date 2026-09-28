import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { ThemeService } from './theme.service';

/** Injeta um `matchMedia` controlado para simular a preferência do sistema. */
function stubMatchMedia(prefersLight: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('light') ? prefersLight : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    }),
  });
}

const root = (): HTMLElement => document.documentElement;

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    root().className = '';
    root().removeAttribute('style');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('segue a preferência do sistema quando não há escolha salva', () => {
    stubMatchMedia(false);
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('dark');
  });

  it('usa o tema claro quando o sistema pede claro', () => {
    stubMatchMedia(true);
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('light');
  });

  it('ignora o sistema quando existe escolha salva', () => {
    stubMatchMedia(false);
    localStorage.setItem('ledger:theme', 'light');
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('light');
  });

  it('aplica a classe dark no documento e expõe color-scheme', () => {
    stubMatchMedia(false);
    const theme = TestBed.inject(ThemeService);
    theme.set('dark');
    TestBed.tick();
    expect(root().classList.contains('dark')).toBe(true);
    expect(root().style.colorScheme).toBe('dark');

    theme.set('light');
    TestBed.tick();
    expect(root().classList.contains('dark')).toBe(false);
    expect(root().style.colorScheme).toBe('light');
  });

  it('toggle alterna entre os dois temas', () => {
    stubMatchMedia(false);
    const theme = TestBed.inject(ThemeService);
    const inicial = theme.theme();

    theme.toggle();
    expect(theme.theme()).toBe(inicial === 'dark' ? 'light' : 'dark');

    theme.toggle();
    expect(theme.theme()).toBe(inicial);
  });

  it('persiste o tema escolhido', () => {
    stubMatchMedia(false);
    const theme = TestBed.inject(ThemeService);

    theme.set('light');
    TestBed.tick();
    expect(localStorage.getItem('ledger:theme')).toBe('light');
  });

  it('cai no tema do sistema quando o localStorage lança', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('bloqueado');
    };
    try {
      stubMatchMedia(false);
      const theme = TestBed.inject(ThemeService);
      expect(theme.theme()).toBe('dark');
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
