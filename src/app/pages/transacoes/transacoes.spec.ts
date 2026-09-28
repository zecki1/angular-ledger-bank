import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransacoesPage } from './transacoes';

describe('TransacoesPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TransacoesPage],
      providers: [provideRouter([])],
    });
  });

  it('deve criar e expor o título da página', () => {
    const fixture = TestBed.createComponent(TransacoesPage);
    expect(fixture.componentInstance.titulo).toBe('Transacoes');
  });
});
