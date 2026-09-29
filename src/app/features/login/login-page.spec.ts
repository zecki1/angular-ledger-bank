import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { Router, provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { MockInstance } from 'vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { LoginPage } from './login-page';

const validForm = { invalid: false, value: { email: 'ana@exemplo.com', password: '123456' } } as unknown as NgForm;

describe('LoginPage', () => {
  let navigateSpy: MockInstance<Router['navigate']>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter([])],
    }).compileComponents();
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  const create = (): ComponentFixture<LoginPage> => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    return fixture;
  };

  it('renderiza título e dica do usuário demo', () => {
    const text = create().nativeElement.textContent ?? '';
    expect(text).toContain('Acesse seu Ledger');
    expect(text).toContain('user@demo.dev');
  });

  it('loga com credenciais válidas e navega para o dashboard', () => {
    const comp = create().componentInstance;
    TestBed.runInInjectionContext(() => comp.login(validForm));
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(TestBed.inject(AuthService).userEmail()).toBe('ana@exemplo.com');
  });

  it('não loga com formulário inválido', () => {
    const comp = create().componentInstance;
    TestBed.runInInjectionContext(() => comp.login({ invalid: true, value: {} } as unknown as NgForm));
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('entra no modo demo', () => {
    const comp = create().componentInstance;
    TestBed.runInInjectionContext(() => comp.loginDemo());
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(TestBed.inject(AuthService).userEmail()).toBe('user@demo.dev');
  });

  it('exibe erro quando a autenticação falha', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            login: () => throwError(() => new Error('boom')),
            loginDemo: () => throwError(() => new Error('boom')),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    fixture.componentInstance.login(validForm);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível entrar.');
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});