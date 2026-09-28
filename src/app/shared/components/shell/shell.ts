import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LedgerDataService } from '../../../core/services/ledger-data.service';
import { ThemeService } from '../../../core/services/theme.service';
import { formatBRL } from '../../../core/utils/format';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styles: [
    `
      :host {
        display: block;
      }
      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        border-radius: var(--radius-lg);
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-mute);
        transition: color 0.15s ease, background-color 0.15s ease;
      }
      .nav-link:hover {
        color: var(--color-cream);
        background-color: var(--color-surface-2);
      }
      .nav-link[aria-current='page'] {
        color: var(--color-brand-soft);
        background-color: color-mix(in srgb, var(--color-brand) 12%, transparent);
        font-weight: 600;
      }
      .sidebar {
        background: var(--color-surface);
        border-right: 1px solid var(--color-border);
      }
      .sidebar-header {
        border-bottom: 1px solid var(--color-border);
      }
      .sidebar-footer {
        border-top: 1px solid var(--color-border);
      }
      .user-info {
        background: var(--color-surface-2);
        border-radius: var(--radius-lg);
        padding: 0.75rem;
      }
      .theme-btn,
      .logout-btn {
        border-radius: var(--radius-md);
        transition: all 0.15s ease;
      }
      .theme-btn:hover {
        border-color: var(--color-brand-soft);
        color: var(--color-brand-soft);
      }
      .logout-btn:hover {
        border-color: var(--color-down);
        color: var(--color-down);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthService);
  private readonly data = inject(LedgerDataService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly userName = this.auth.userName;
  readonly userEmail = this.auth.userEmail;

  readonly total = toSignal(this.data.getTotalAccounts(), { initialValue: 0 });
  readonly totalLabel = computed(() => formatBRL(this.total()));

  readonly isDark = computed(() => this.theme.theme() === 'dark');
  readonly themeLabel = computed(() => (this.isDark() ? 'Ativar tema claro' : 'Ativar tema escuro'));

  readonly nav = [
    { label: 'Dashboard', href: '/dashboard', icon: '▦' },
    { label: 'Transações', href: '/transacoes', icon: '☰' },
    { label: 'Investimentos', href: '/investimentos', icon: '↗' },
    { label: 'Cotações', href: '/cotacoes', icon: '◈' },
    { label: 'Configurações', href: '/configuracoes', icon: '⚙' },
  ] as const;

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
