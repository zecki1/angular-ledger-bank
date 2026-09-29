import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Transaction } from '../../../core/models';
import { CATEGORY_LABEL, TYPE_LABEL, formatDayLong, formatSignedBRL } from '../../../core/utils/format';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  template: `
    <ul class="divide-y divide-border">
      @for (tx of transactions(); track tx.id) {
        <li class="flex items-center gap-4 py-3 hover:bg-surface-2 transition-colors">
          <span
            class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
            [style.background]="tx.direction === 'in' ? 'var(--color-up-bg)' : 'var(--color-down-bg)'"
            [style.color]="tx.direction === 'in' ? 'var(--color-up)' : 'var(--color-down)'"
            aria-hidden="true"
          >
            {{ tx.direction === 'in' ? '↓' : '↑' }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate font-medium">{{ tx.description }}</p>
            <p class="truncate text-xs text-mute">
              {{ typeLabel[tx.type] }} · {{ categoryLabel[tx.category] ?? tx.category }} · {{ day(tx.settledAt) }}
            </p>
          </div>

          <p
            class="shrink-0 text-sm font-semibold tabular-nums"
            [style.color]="tx.direction === 'in' ? 'var(--color-up)' : 'var(--color-down)'"
          >
            {{ signed(tx) }}
          </p>
        </li>
      } @empty {
        <li class="py-10 text-center text-sm text-mute">Nenhuma transação encontrada.</li>
      }
    </ul>
  `,
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionList {
  readonly transactions = input<Transaction[]>([]);

  readonly typeLabel = TYPE_LABEL;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly day = formatDayLong;

  readonly signed = (tx: Transaction) => formatSignedBRL(tx.amount, tx.direction);
}