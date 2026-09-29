import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { environment } from '../../../environments/environment';
import { fromDayKey } from '../utils/format';
import { LedgerDataService, dayKey } from './ledger-data.service';
import { resetSupabaseClient } from './supabase-client';

/**
 * Supabase é mockado para exercitar o ramo "com credenciais": o builder é uma
 * thenable que resolve `{ data, error }` controlado por teste (mesmo contrato
 * do PostgrestFilterBuilder usado em produção).
 */
const supabaseMock = vi.hoisted(() => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    then: undefined as undefined | ((resolve: (value: unknown) => void) => void),
  };
  const client = { from: vi.fn(() => builder) };
  const payload: { data: unknown[] | null; error: Error | null } = { data: [], error: null };
  return { createClient: vi.fn(() => client), client, builder, payload };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: supabaseMock.createClient }));

describe('LedgerDataService (modo demo)', () => {
  let service: LedgerDataService;

  beforeEach(() => {
    environment.supabaseUrl = '';
    environment.supabaseAnonKey = '';
    resetSupabaseClient();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LedgerDataService);
  });

  it('retorna as contas do seed', () => {
    let accounts: unknown[] = [];
    service.getAccounts().subscribe((value) => (accounts = value));
    expect(accounts).toHaveLength(3);
    expect(accounts.map((a) => (a as { type: string }).type)).toEqual([
      'conta_corrente',
      'poupanca',
      'cartao_credito',
    ]);
  });

  it('retorna transações ordenáveis do seed', () => {
    let transactions: unknown[] = [];
    service.getTransactions().subscribe((value) => (transactions = value));
    expect(transactions.length).toBeGreaterThan(30);
    expect(transactions.every((t) => (t as { amount: number }).amount > 0)).toBe(true);
  });

  it('filtra transações por conta', () => {
    let transactions: unknown[] = [];
    service.getTransactions('acc-cartao').subscribe((value) => (transactions = value));
    expect(transactions.every((t) => (t as { accountId: string }).accountId === 'acc-cartao')).toBe(true);
  });

  it('gera fluxo de caixa com 30 dias', () => {
    let points: unknown[] = [];
    service.getCashFlow().subscribe((value) => (points = value));
    expect(points).toHaveLength(30);
    expect(points.every((p) => Number.isFinite((p as { value: number }).value))).toBe(true);
  });

  it('totaliza as contas', () => {
    let total = 0;
    service.getTotalAccounts().subscribe((value) => (total = value));
    expect(total).toBeCloseTo(8432.7 + 23910.15 + 1240.9, 2);
  });
});

describe('LedgerDataService (com Supabase)', () => {
  let service: LedgerDataService;

  function install(rows: unknown[] | null, error: Error | null): void {
    supabaseMock.payload.data = rows;
    supabaseMock.payload.error = error;
    supabaseMock.builder.select.mockReturnValue(supabaseMock.builder);
    supabaseMock.builder.eq.mockReturnValue(supabaseMock.builder);
    supabaseMock.builder.then = (resolve) => resolve({ data: supabaseMock.payload.data, error: supabaseMock.payload.error });
  }

  beforeEach(() => {
    resetSupabaseClient();
    environment.supabaseUrl = 'https://test.supabase.co';
    environment.supabaseAnonKey = 'anon-key';
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(LedgerDataService);
  });

  afterEach(() => {
    environment.supabaseUrl = '';
    environment.supabaseAnonKey = '';
    resetSupabaseClient();
  });

  it('mapeia accounts do Supabase para o modelo', async () => {
    install(
      [{ id: 'a1', name: 'Conta Teste', type: 'poupanca', balance: 100.5, currency: 'BRL' }],
      null,
    );
    // O cliente Supabase é carregado por `import()` dinâmico, então a emissão é
    // assíncrona mesmo com o módulo mockado.
    const accounts = await firstValueFrom(service.getAccounts());
    expect(accounts[0]).toMatchObject({
      id: 'a1',
      name: 'Conta Teste',
      type: 'poupanca',
      balance: 100.5,
      currency: 'BRL',
    });
    expect(supabaseMock.client.from).toHaveBeenCalledWith('accounts');
  });

  it('filtra transações por account_id no Supabase', async () => {
    install(
      [
        {
          id: 't1',
          account_id: 'acc-x',
          type: 'pix',
          description: 'Feira',
          amount: 50,
          direction: 'out',
          category: 'alimentacao',
          settled_at: '2026-09-20T10:00:00.000Z',
        },
      ],
      null,
    );
    const transactions = await firstValueFrom(service.getTransactions('acc-x'));
    expect(transactions[0]).toMatchObject({ id: 't1', accountId: 'acc-x', type: 'pix', amount: 50 });
    expect(supabaseMock.builder.eq).toHaveBeenCalledWith('account_id', 'acc-x');
  });

  it('agrega fluxo de caixa diário a partir das transações', async () => {
    install(
      [
        { id: 't1', account_id: 'a', type: 'debito', description: 'Padaria', amount: 30, direction: 'out', category: 'alimentacao', settled_at: '2026-09-20T10:00:00.000Z' },
        { id: 't2', account_id: 'a', type: 'credito', description: 'Salário', amount: 1000, direction: 'in', category: 'salario', settled_at: '2026-09-20T11:30:00.000Z' },
      ],
      null,
    );
    const points = await firstValueFrom(service.getCashFlow());
    expect(points).toEqual([{ date: '2026-09-20', value: 970 }]);
  });

  it('recai no seed local quando o Supabase retorna erro', async () => {
    install(null, new Error('permission denied'));
    const accounts = await firstValueFrom(service.getAccounts());
    expect(accounts).toHaveLength(3);
  });
});

describe('dayKey', () => {
  it('extrai o dia no formato YYYY-MM-DD', () => {
    expect(dayKey('2026-09-22T23:59:59.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('usa o dia local, não o dia UTC', () => {
    // Invariante válida em qualquer fuso: a chave é sempre o dia local do mesmo
    // instante (o bug original truncava em UTC e virava o dia anterior).
    const iso = '2026-09-22T00:30:00.000Z';
    const instant = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDay = `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
    expect(dayKey(iso)).toBe(localDay);
  });

  it('fromDayKey monta a data sem deslocar o dia', () => {
    // `new Date('2026-09-21')` é meia-noite UTC e vira o dia 20 em fusos
    // negativos; `fromDayKey` monta com as partes locais.
    const date = fromDayKey('2026-09-21');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(21);
  });
});
