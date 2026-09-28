import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { TransactionsPage } from './transactions-page';

describe('TransactionsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  const create = (): ComponentFixture<TransactionsPage> => {
    const fixture = TestBed.createComponent(TransactionsPage);
    fixture.detectChanges();
    return fixture;
  };

  it('renderiza a tabela com transações do dataset', () => {
    const host = create().nativeElement as HTMLElement;
    expect(host.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect(host.textContent).toContain('Exportar CSV');
  });

  it('filtra pela busca e reinicia a paginação', () => {
    const fixture = create();
    fixture.componentInstance.onSearch('salário');
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Salário');
  });

  it('filtra por tipo', () => {
    const fixture = create();
    fixture.componentInstance.onType('credito');
    fixture.detectChanges();
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(fixture.nativeElement.textContent).toContain('Crédito');
  });

  it('navega entre páginas', () => {
    const fixture = create();
    fixture.componentInstance.onPageChange(2);
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(2);
  });

  it('deriva as categorias do conjunto de dados', () => {
    const comp = create().componentInstance;
    expect(comp.categories().length).toBeGreaterThan(3);
    expect(comp.categories()).toContain('alimentacao');
  });

  it('exporta CSV com os dados filtrados sem lançar erro', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:ledger');
    const revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const comp = create().componentInstance;
    expect(() => comp.exportCsv()).not.toThrow();
    expect(createObjectURL).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();

    // @ts-expect-error restaura o ambiente do jsdom
    delete URL.createObjectURL;
    // @ts-expect-error restaura o ambiente do jsdom
    delete URL.revokeObjectURL;
  });

  it('mostra mensagem de vazio quando nada corresponde ao filtro', () => {
    const fixture = create();
    fixture.componentInstance.onSearch('XXXXXXXXXXXXXX');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhuma transação atende aos filtros.');
  });
});