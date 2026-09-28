import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { Account } from '../../../core/models';
import { BalanceCard } from './balance-card';

const account: Account = {
  id: 'acc-corrente',
  name: 'Conta Corrente',
  type: 'conta_corrente',
  balance: 8432.7,
  currency: 'BRL',
  color: '#8b5cf6',
};

const spaces = (s: string): string => s.replace(/\u00a0/g, ' ');

describe('BalanceCard', () => {
  let fixture: ComponentFixture<BalanceCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceCard],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BalanceCard);
    fixture.componentRef.setInput('account', account);
    fixture.detectChanges();
  });

  const host = () => fixture.nativeElement as HTMLElement;

  it('renderiza nome, saldo formatado e tipo da conta', () => {
    expect(host().textContent).toContain('Conta Corrente');
    expect(spaces(host().textContent ?? '')).toContain('R$ 8.432,70');
    expect(host().textContent).toContain('Conta corrente');
  });

  it('vincula o card ao extrato da conta', () => {
    const link = host().querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/conta/acc-corrente');
  });

  it('usa ícone de cartão para cartao_credito', () => {
    fixture.componentRef.setInput('account', { ...account, type: 'cartao_credito' });
    fixture.detectChanges();
    expect(host().textContent).toContain('▛');
  });

  it('usa ícone circular para conta corrente', () => {
    expect(host().textContent).toContain('●');
  });
});