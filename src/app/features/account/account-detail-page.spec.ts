import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { AccountDetailPage } from './account-detail-page';


const normalize = (t: string): string => t.replace(/\u00a0/g, ' ');


describe('AccountDetailPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountDetailPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const create = (id: string): ComponentFixture<AccountDetailPage> => {
    const fixture = TestBed.createComponent(AccountDetailPage);
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    return fixture;
  };

  it('mostra saldo e resumo de entradas e saídas', () => {
    const text = create('acc-corrente').nativeElement.textContent ?? '';
    expect(normalize(text)).toContain('R$ 8.432,70');
    expect(text).toContain('Entradas');
    expect(text).toContain('Saídas');
  });

  it('lista o extrato agrupado por dia', () => {
    const text = create('acc-corrente').nativeElement.textContent ?? '';
    expect(text).toContain('Extrato');
    expect(normalize(text)).toContain('Salário — Bolts Técnica');
    expect(normalize(text)).toContain('Hoje');
  });

  it('agrupa transações com totais coerentes', () => {
    const comp = create('acc-corrente').componentInstance;
    expect(comp.totalIn()).toBeGreaterThan(0);
    expect(comp.totalOut()).toBeGreaterThan(0);
    expect(comp.groups().length).toBeGreaterThan(0);
  });

  it('lida com conta inexistente', () => {
    const text = create('acc-inexistente').nativeElement.textContent ?? '';
    expect(text).toContain('Sem movimentações nesta conta.');
  });
});