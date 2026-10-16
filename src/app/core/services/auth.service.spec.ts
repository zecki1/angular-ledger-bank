import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { AuthService, createUser } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('começa deslogado', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('loginDemo autentica e persiste a sessão', () => {
    let user: unknown;
    service.loginDemo().subscribe((u) => (user = u));

    expect(service.isAuthenticated()).toBe(true);
    expect(service.userEmail()).toBe('user@demo.dev');
    expect(JSON.parse(localStorage.getItem('ledger:session') ?? '{}')).toMatchObject({ email: 'user@demo.dev' });
    expect(user).toMatchObject({ email: 'user@demo.dev' });
  });

  it('login com credenciais cria sessão no modo demo', () => {
    service.login('ana@exemplo.com', '123456').subscribe();
    expect(service.userEmail()).toBe('ana@exemplo.com');
    expect(service.userName()).toBe('Ana');
  });

  it('restaura sessão do localStorage na criação', () => {
    localStorage.setItem('ledger:session', JSON.stringify(createUser('ana@exemplo.com', 'Ana')));

    // força uma instância nova do serviço (o TestBed cachêia o singleton anterior)
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const reloaded = TestBed.inject(AuthService);

    expect(reloaded.isAuthenticated()).toBe(true);
    expect(reloaded.userEmail()).toBe('ana@exemplo.com');
  });

  it('logout limpa a sessão', () => {
    service.loginDemo().subscribe();
    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('ledger:session')).toBeNull();
  });

  it('normaliza o e-mail para minúsculas', () => {
    expect(createUser('Ana@Exemplo.com').email).toBe('ana@exemplo.com');
  });

  it('signup cria a sessão com CPF, nascimento e provedor', () => {
    let user: { cpf?: string; nascimento?: string; provedor?: string } | undefined;
    service
      .signup({
        nome: 'Ana Souza',
        email: 'Ana@Exemplo.com',
        cpf: '52998224725',
        nascimento: '1990-05-20',
        senha: 'Senha@123',
      })
      .subscribe((u) => (user = u));

    expect(service.isAuthenticated()).toBe(true);
    expect(service.userEmail()).toBe('ana@exemplo.com');
    expect(service.userName()).toBe('Ana Souza');
    expect(user).toMatchObject({
      cpf: '52998224725',
      nascimento: '1990-05-20',
      provedor: 'senha',
    });
    expect(JSON.parse(localStorage.getItem('ledger:session') ?? '{}')).toMatchObject({
      email: 'ana@exemplo.com',
    });
  });

  it('loginComGoogle cria sessão com provedor google no modo demo', () => {
    let provedor: string | undefined;
    service.loginComGoogle().subscribe((u) => (provedor = u.provedor));

    expect(service.isAuthenticated()).toBe(true);
    expect(provedor).toBe('google');
  });

  it('inscreverMfa devolve segredo e provisão no modo demo', () => {
    let uri = '';
    let segredo = '';
    service.inscreverMfa('ana@exemplo.com').subscribe((m) => {
      uri = m.uri;
      segredo = m.segredo;
    });

    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(segredo).toMatch(/^[A-Z2-7]{16}$/);
  });

  it('confirmarMfa marca o 2FA como habilitado', () => {
    service.loginDemo().subscribe();
    service.confirmarMfa('123456').subscribe();
    expect(service.temMfa()).toBe(true);
  });

  it('definirBiometria grava a marca na sessão', () => {
    service.loginDemo().subscribe();
    service.definirBiometria(true);

    expect(service.session()?.biometria).toBe(true);
    expect(JSON.parse(localStorage.getItem('ledger:session') ?? '{}')).toMatchObject({
      biometria: true,
    });
  });
});