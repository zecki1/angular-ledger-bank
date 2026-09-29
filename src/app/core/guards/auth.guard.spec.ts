import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter, UrlTree } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';

import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  function call(): unknown {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  it('permite acesso quando autenticado', () => {
    TestBed.inject(AuthService).loginDemo().subscribe();
    expect(call()).toBe(true);
  });

  it('redireciona para /login quando deslogado', () => {
    const result = call();
    expect(result instanceof UrlTree).toBe(true);
    expect((result as UrlTree).toString()).toBe('/login');
  });
});