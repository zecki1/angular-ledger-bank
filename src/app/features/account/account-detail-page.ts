import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { LedgerDataService, dayKey } from '../../core/services/ledger-data.service';
import { Transaction } from '../../core/models';
import { TYPE_LABEL, CATEGORY_LABEL, formatBRL, formatDayLong, formatSignedBRL } from '../../core/utils/format';

@Component({
  selector: 'app-account-detail-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './account-detail-page.html',
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDetailPage {
  private readonly data = inject(LedgerDataService);

  readonly id = input.required<string>();

  readonly accounts = toSignal(this.data.getAccounts(), { initialValue: [] });
  readonly account = computed(() => this.accounts().find((account) => account.id === this.id()) ?? null);

  readonly transactions = toSignal(
    toObservable(this.id).pipe(switchMap((id) => this.data.getTransactions(id))),
    { initialValue: [] as Transaction[] },
  );

  readonly sorted = computed(() =>
    [...this.transactions()].sort(
      (a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime(),
    ),
  );

  readonly totalIn = computed(() =>
    this.sorted().filter((tx) => tx.direction === 'in').reduce((sum, tx) => sum + tx.amount, 0),
  );
  readonly totalOut = computed(() =>
    this.sorted().filter((tx) => tx.direction === 'out').reduce((sum, tx) => sum + tx.amount, 0),
  );

  readonly groups = computed(() => {
    const groups = new Map<string, Transaction[]>();
    for (const tx of this.sorted()) {
      const key = dayKey(tx.settledAt);
      groups.set(key, [...(groups.get(key) ?? []), tx]);
    }
    return [...groups.entries()];
  });

  readonly brl = formatBRL;
  readonly signed = (tx: Transaction) => formatSignedBRL(tx.amount, tx.direction);
  readonly typeLabel = TYPE_LABEL;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly formatDay = formatDayLong;
}