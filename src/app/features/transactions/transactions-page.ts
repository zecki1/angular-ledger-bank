import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LedgerDataService } from '../../core/services/ledger-data.service';
import { CATEGORY_LABEL, TYPE_LABEL, downloadCSV, filterTransactions, formatDate, formatSignedBRL, toCSV } from '../../core/utils/format';
import { Pagination } from '../../shared/components/pagination/pagination';

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [FormsModule, RouterLink, Pagination],
  templateUrl: './transactions-page.html',
  styles: [
    `
      :host {
        display: block;
      }
      .select {
        border-radius: 0.5rem;
        border: 1px solid var(--color-border);
        background-color: var(--color-surface);
        padding: 0.5rem 0.75rem;
        font-size: 0.875rem;
        color: var(--color-cream);
        outline: none;
      }
      .select:focus {
        border-color: var(--color-brand-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  private readonly data = inject(LedgerDataService);

  readonly transactions = toSignal(this.data.getTransactions(), { initialValue: [] });

  readonly search = signal('');
  readonly type = signal('');
  readonly category = signal('');
  readonly page = signal(1);
  readonly pageSize = 8;

  readonly typeLabel = TYPE_LABEL;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly formatDate = formatDate;

  readonly types = Object.keys(TYPE_LABEL) as (keyof typeof TYPE_LABEL)[];
  readonly categories = computed(() => [
    ...new Set(this.transactions().map((tx) => tx.category)),
  ]);

  readonly filtered = computed(() =>
    filterTransactions(this.transactions(), {
      search: this.search(),
      type: this.type(),
      category: this.category(),
    }),
  );

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageRows = computed(() =>
    this.filtered().slice(
      (this.page() - 1) * this.pageSize,
      this.page() * this.pageSize,
    ),
  );

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onType(value: string): void {
    this.type.set(value);
    this.page.set(1);
  }

  onCategory(value: string): void {
    this.category.set(value);
    this.page.set(1);
  }

  onPageChange(page: number): void {
    this.page.set(page);
  }

  exportCsv(): void {
    downloadCSV('ledger-transacoes.csv', toCSV(this.filtered()));
  }

  signed = (amount: number, direction: 'in' | 'out') => formatSignedBRL(amount, direction);
}