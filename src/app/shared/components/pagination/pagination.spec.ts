import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { Pagination } from './pagination';

describe('Pagination', () => {
  let fixture: ComponentFixture<Pagination>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Pagination] }).compileComponents();
    fixture = TestBed.createComponent(Pagination);
  });

  it('emite página ao clicar em próxima', () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 10);
    fixture.detectChanges();

    let emitted = 0;
    fixture.componentInstance.pageChange.subscribe((page) => (emitted = page));

    const next = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === 'Próxima página',
    );
    next?.click();

    expect(emitted).toBe(2);
  });

  it('desabilita a volta na primeira página', () => {
    fixture.componentRef.setInput('page', 1);
    fixture.componentRef.setInput('totalPages', 10);
    fixture.detectChanges();

    const previous = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === 'Página anterior',
    );
    expect(previous?.disabled).toBe(true);
  });

  it('expõe janela de até 5 páginas centrada', () => {
    fixture.componentRef.setInput('page', 9);
    fixture.componentRef.setInput('totalPages', 12);
    fixture.detectChanges();

    expect(fixture.componentInstance.window()).toEqual([7, 8, 9, 10, 11]);
  });

  it('ancora a janela na última página', () => {
    fixture.componentRef.setInput('page', 12);
    fixture.componentRef.setInput('totalPages', 12);
    fixture.detectChanges();

    expect(fixture.componentInstance.window()).toEqual([8, 9, 10, 11, 12]);
  });
});