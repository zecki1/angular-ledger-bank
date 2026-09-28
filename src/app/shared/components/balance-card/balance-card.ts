import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Account, AccountType } from '../../../core/models';
import { formatBRL } from '../../../core/utils/format';

const TYPE_LABEL: Record<AccountType, string> = {
  conta_corrente: 'Conta corrente',
  poupanca: 'Poupança',
  cartao_credito: 'Cartão de crédito',
};

@Component({
  selector: 'app-balance-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <a
      routerLink="/conta/{{ account().id }}"
      class="card group flex h-full flex-col justify-between gap-4 p-5 transition-all duration-200 hover:shadow-md hover:border-border-strong hover:-translate-y-0.5"
    >
      <div class="flex items-center justify-between">
        <span
          class="inline-flex items-center justify-center rounded-lg p-2 text-base"
          [style.background]="account().color + '26'"
          [style.color]="account().color"
          aria-hidden="true"
        >
          {{ icon() }}
        </span>
        <span class="text-xs font-medium uppercase tracking-wide text-mute">{{ typeLabel[account().type] }}</span>
      </div>

      <div>
        <p class="text-sm text-mute">{{ account().name }}</p>
        <p class="mt-1 text-2xl font-bold tracking-tight">{{ brl(account().balance) }}</p>
        <p class="mt-2 flex items-center gap-1 text-xs text-brand-soft opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Ver extrato →
        </p>
      </div>
    </a>
  `,
  styles: [':host { display: block; height: 100%; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceCard {
  readonly account = input.required<Account>();

  readonly typeLabel = TYPE_LABEL;
  readonly brl = formatBRL;

  icon(): string {
    return this.account().type === 'cartao_credito'
      ? '▛'
      : this.account().type === 'poupanca'
        ? '◔'
        : '●';
  }
}