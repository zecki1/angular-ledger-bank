import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContaPage } from './conta';

describe('ContaPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContaPage],
      providers: [provideRouter([])],
    });
  });

  it('deve criar e expor o título da página', () => {
    const fixture = TestBed.createComponent(ContaPage);
    expect(fixture.componentInstance.titulo).toBe('Detalhe de conta');
  });
});
