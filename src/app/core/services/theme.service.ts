import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'ledger:theme';

/**
 * Tema claro/escuro com persistência e respeito à preferência do sistema.
 *
 * O atributo `class="dark"` fica no `<html>` porque os tokens do Tailwind
 * (seção `@theme` + overrides em `styles.css`) são redefinidos por seletor de
 * classe — `prefers-color-scheme` sozinho não daria controle manual, que é o
 * que a spec da Semana 3 pede.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly current = signal<Theme>(this.readInitial());

  readonly theme = this.current.asReadonly();
  readonly isDark = () => this.current() === 'dark';

  constructor() {
    effect(() => this.apply(this.current()));
  }

  toggle(): void {
    this.current.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this.current.set(theme);
  }

  private readInitial(): Theme {
    if (!this.isBrowser) {
      return 'dark';
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // localStorage indisponível — cai na preferência do sistema
    }
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  private apply(theme: Theme): void {
    if (!this.isBrowser) {
      return;
    }
    const root = this.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage indisponível (testes) — segue
    }
  }
}
