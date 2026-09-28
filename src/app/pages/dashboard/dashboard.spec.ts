import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DashboardPage } from './dashboard';

describe('DashboardPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([])],
    });
  });

  it('deve criar e expor o título da página', () => {
    const fixture = TestBed.createComponent(DashboardPage);
    expect(fixture.componentInstance.titulo).toBe('Dashboard');
  });
});
