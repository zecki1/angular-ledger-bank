import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ThemeService } from '../../../core/services/theme.service';
import { PortfolioService } from '../../../core/services/portfolio.service';
import { toCSV, downloadCSV, formatDate } from '../../../core/utils/format';
import { LedgerDataService } from '../../../core/services/ledger-data.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings-page.html',
  styles: [':host { display: block; }'],
})
export class SettingsPage {
  private readonly theme = inject(ThemeService);
  private readonly portfolio = inject(PortfolioService);
  private readonly data = inject(LedgerDataService);
  private readonly router = inject(Router);

  protected readonly isDark = computed(() => this.theme.theme() === 'dark');
  protected readonly exportadoEm = signal<string>('');

  private readonly transacoes = toSignal(this.data.getTransactions(), { initialValue: [] });

  protected readonly moedas = ['BRL', 'USD', 'EUR'] as const;
  protected readonly moeda = signal<string>(this.lerPref('ledger:moeda') || 'BRL');

  protected get transacoesTotal(): number {
    return this.transacoes().length;
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  definirMoeda(valor: string): void {
    this.moeda.set(valor);
    try {
      localStorage.setItem('ledger:moeda', valor);
    } catch {
      // Sem storage a preferência vale só nesta sessão.
    }
  }

  exportarCsv(): void {
    const conteudo = toCSV(this.transacoes());
    const nome = `ledger-transacoes-${formatDate(new Date().toISOString()).replace(/\//g, '-')}.csv`;
    downloadCSV(nome, conteudo);
    this.exportadoEm.set(new Date().toLocaleTimeString('pt-BR'));
  }

  async limparCacheCotacoes(): Promise<void> {
    await this.portfolio.recarregar();
  }

  voltarAoDashboard(): void {
    void this.router.navigate(['/dashboard']);
  }

  private lerPref(chave: string): string {
    try {
      return localStorage.getItem(chave) ?? '';
    } catch {
      return '';
    }
  }
}
