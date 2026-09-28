import { Injectable } from '@angular/core';
import { Observable, catchError, from, map, of, shareReplay, switchMap } from 'rxjs';

import { Account, CashFlowPoint, Transaction } from '../models';
import { demoSeed } from './demo-data';
import { getSupabaseClient, temSupabase } from './supabase-client';

/**
 * Uma única fonte de dados para o app. Com Supabase configurado (VITE_*)
 * lê de `accounts` + `transactions` (RLS por dono); sem config, roda o seed
 * local de demonstração — o app nunca quebra na ausência de credenciais.
 */
@Injectable({ providedIn: 'root' })
export class LedgerDataService {
  private readonly demo = demoSeed();

  getAccounts(): Observable<Account[]> {
    return this.query<Account[]>('accounts', (rows) => this.toAccounts(rows), this.demo.accounts);
  }

  getTransactions(accountId?: string): Observable<Transaction[]> {
    const demoRows = accountId
      ? this.demo.transactions.filter((tx) => tx.accountId === accountId)
      : this.demo.transactions;
    return this.query<Transaction[]>(
      'transactions',
      (rows) => this.toTransactions(rows),
      demoRows,
      accountId ? { column: 'account_id', value: accountId } : undefined,
    );
  }

  getCashFlow(): Observable<CashFlowPoint[]> {
    if (!temSupabase()) {
      return of(this.demoCashFlow());
    }
    return this.getTransactions().pipe(
      map((transactions) => this.aggregateCashFlow(transactions)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  getTotalAccounts(): Observable<number> {
    return this.getAccounts().pipe(
      map((accounts) => accounts.reduce((sum, account) => sum + account.balance, 0)),
    );
  }

  private query<T>(
    table: 'accounts' | 'transactions',
    mapper: (rows: unknown[]) => T,
    fallback: T,
    filter?: { column: string; value: string },
  ): Observable<T> {
    if (!temSupabase()) {
      return of(fallback);
    }
    return from(getSupabaseClient()).pipe(
      switchMap((client) => {
        if (!client) {
          return of(fallback);
        }
        let builder = client.from(table).select('*');
        if (filter) {
          builder = builder.eq(filter.column, filter.value);
        }
        return from(builder).pipe(
          map(({ data, error }) => {
            if (error || !data) {
              throw error ?? new Error(`Falha ao ler ${table}`);
            }
            return mapper(data);
          }),
        );
      }),
      catchError(() => of(fallback)),
    );
  }

  private aggregateCashFlow(transactions: Transaction[]): CashFlowPoint[] {
    const byDay = new Map<string, number>();
    for (const tx of transactions) {
      const day = dayKey(tx.settledAt);
      const delta = tx.direction === 'in' ? tx.amount : -tx.amount;
      byDay.set(day, (byDay.get(day) ?? 0) + delta);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, value]) => ({ date, value }));
  }

  private demoCashFlow(): CashFlowPoint[] {
    const points: CashFlowPoint[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = dayKey(date.toISOString());
      const dayTxs = this.demo.transactions.filter((tx) => dayKey(tx.settledAt) === key);
      const value = dayTxs.reduce((sum, tx) => sum + (tx.direction === 'in' ? tx.amount : -tx.amount), 0);
      points.push({ date: key, value });
    }
    return points;
  }

  private toAccounts(rows: unknown[]): Account[] {
    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r['id']),
        name: String(r['name'] ?? 'Conta'),
        type: r['type'] as Account['type'],
        balance: Number(r['balance'] ?? 0),
        currency: String(r['currency'] ?? 'BRL'),
        color: '#8b5cf6',
      } satisfies Account;
    });
  }

  private toTransactions(rows: unknown[]): Transaction[] {
    return rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r['id']),
        accountId: String(r['account_id']),
        type: r['type'] as Transaction['type'],
        description: String(r['description']),
        amount: Number(r['amount'] ?? 0),
        direction: r['direction'] as Transaction['direction'],
        category: String(r['category'] ?? 'outros'),
        settledAt: String(r['settled_at'] ?? new Date().toISOString()),
      } satisfies Transaction;
    });
  }
}

/**
 * Dia no formato `YYYY-MM-DD` a partir das partes **locais** da data.
 *
 * Usar `toISOString().slice(0, 10)` trunca em UTC, e reconverter essa string
 * para data local podia cair no dia anterior (fuso negativo) — o extrato
 * agrupava "hoje" como "ontem". Um app bancário agrupa pelo dia do cliente.
 */
export function dayKey(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
