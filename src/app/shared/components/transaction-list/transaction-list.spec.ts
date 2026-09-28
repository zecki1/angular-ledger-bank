import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { Transaction } from '../../../core/models';
import { TransactionList } from './transaction-list';

const spaces = (s: string): string => s.replace(/\u00a0/g, ' ');

const tx = (partial: Partial<Transaction>): Transaction => ({
  id: 'x',
  accountId: 'acc-corrente',
  type: 'pix',
  description: 'Feira da Santa Cecília',
  amount: 100,
  direction: 'out',
  category: 'alimentacao',
  settledAt: '2026-09-20T12:00:00.000Z',
  ...partial,
});

describe('TransactionList', () => {
  let fixture: ComponentFixture<TransactionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TransactionList] }).compileComponents();
    fixture = TestBed.createComponent(TransactionList);
    fixture.componentRef.setInput('transactions', [tx({ id: 'a', amount: 150, direction: 'in' })]);
    fixture.detectChanges();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('renderiza descrição, categoria e dia longo', () => {
    const text = host().textContent ?? '';
    expect(text).toContain('Feira da Santa Cecília');
    expect(text).toContain('Alimentação');
  });

  it('exibe valor com sinal positivo para entrada', () => {
    expect(spaces(host().textContent ?? '')).toContain('+ R$ 150,00');
  });

  it('exibe valor com sinal negativo para saída', () => {
    fixture.componentRef.setInput('transactions', [tx({ amount: 47.9, direction: 'out' })]);
    fixture.detectChanges();
    expect(spaces(host().textContent ?? '')).toContain('- R$ 47,90');
  });

  it('mostra estado vazio sem transações', () => {
    fixture.componentRef.setInput('transactions', []);
    fixture.detectChanges();
    expect(host().textContent).toContain('Nenhuma transação encontrada.');
  });
});