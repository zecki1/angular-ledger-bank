import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    });
  });

  it('deve criar o shell', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('mantém login fora do guard e o restante protegido', () => {
    const login = routes.find((route) => route.path === 'login');
    const protectedArea = routes.find((route) => route.path === '');

    expect(login?.canActivate).toBeUndefined();
    expect(protectedArea?.canActivate).toBeDefined();
  });

  it('expõe as rotas da Semana 3', () => {
    const children = routes.find((route) => route.path === '')?.children?.map((route) => route.path);
    expect(children).toEqual(expect.arrayContaining(['', 'dashboard', 'transacoes', 'conta/:id']));
  });
});
