import { Injectable, computed, signal } from '@angular/core';
import { Observable, from, of, switchMap, throwError } from 'rxjs';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { ProvedorAuth, SessionUser } from '../models';
import { getSupabaseClient, temSupabase } from './supabase-client';

const SESSION_KEY = 'ledger:session';

export interface SignupPayload {
  nome: string;
  email: string;
  /** Somente dígitos. */
  cpf: string;
  /** ISO `YYYY-MM-DD`. */
  nascimento: string;
  senha: string;
}

/** Dados de inscrição em 2FA (TOTP) para exibir o QR code. */
export interface MfaEnrollment {
  fatorId: string;
  /** Provisioning URI (`otpauth://…`) usada para gerar o QR code. */
  uri: string;
  /** Segredo em base32, para digitação manual. */
  segredo: string;
  /** `true` quando gerado localmente (modo demo), sem backend. */
  demo: boolean;
}

/**
 * Sessão de autenticação. Com Supabase configurado usa o Auth (signUp,
 * signInWithPassword, OAuth e MFA); sem config, simula tudo localmente (modo
 * demo) e persiste em localStorage. `user@demo.dev` é o acesso de demonstração.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stored = loadSession();

  readonly session = signal<SessionUser | null>(this.stored);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userName = computed(() => this.session()?.name ?? '');
  readonly userEmail = computed(() => this.session()?.email ?? '');
  readonly temMfa = computed(() => this.session()?.mfa === true);

  login(email: string, password: string): Observable<SessionUser> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      return this.completeLogin(createUser(normalized || 'visitante@demo.dev'));
    }
    if (!temSupabase()) {
      return this.completeLogin(createUser(normalized));
    }
    return from(getSupabaseClient()).pipe(
      switchMap((client) => from(signIn(client, normalized, password))),
      switchMap((user) => this.completeLogin(user)),
    );
  }

  /**
   * Cria uma conta. Com Supabase usa `signUp` e envia nome/CPF/nascimento em
   * `options.data` (metadata do usuário); em modo demo cria a sessão local.
   */
  signup(payload: SignupPayload): Observable<SessionUser> {
    const email = payload.email.trim().toLowerCase();
    const base: SessionUser = createUser(email, payload.nome, {
      cpf: payload.cpf,
      nascimento: payload.nascimento,
      provedor: 'senha',
    });

    if (!temSupabase()) {
      return this.completeLogin(base);
    }

    return from(getSupabaseClient()).pipe(
      switchMap((client) => from(signUp(client, payload))),
      switchMap(() => this.completeLogin(base)),
    );
  }

  /**
   * Login social com Google. Com Supabase dispara o OAuth (redirect); em modo
   * demo cria uma sessão local identificada como `google`.
   */
  loginComGoogle(): Observable<SessionUser> {
    if (!temSupabase()) {
      return this.completeLogin(
        createUser('usuario.google@gmail.com', 'Usuário Google', { provedor: 'google' }),
      );
    }
    return from(getSupabaseClient()).pipe(
      switchMap((client) => from(signInWithGoogle(client))),
      switchMap((user) => this.completeLogin(user)),
    );
  }

  /** Inicia a inscrição em 2FA/TOTP, devolvendo o QR code para o usuário. */
  inscreverMfa(email: string): Observable<MfaEnrollment> {
    if (!temSupabase()) {
      return of(enrollMfaDemo(email));
    }
    return from(getSupabaseClient()).pipe(switchMap((client) => from(enrollMfa(client))));
  }

  /** Confirma o código TOTP e marca o 2FA como habilitado na sessão. */
  confirmarMfa(codigo: string): Observable<SessionUser> {
    if (!/^\d{6}$/.test(codigo.trim())) {
      return throwError(() => new Error('Código de verificação inválido'));
    }
    const atual = this.session();
    if (!atual) {
      return of(createUser(environment.demoEmail, 'Usuário Demo'));
    }
    return this.completeLogin({ ...atual, mfa: true });
  }

  /** Aplica o resultado da biometria (WebAuthn) à sessão atual. */
  definirBiometria(ativo: boolean): void {
    const atual = this.session();
    if (!atual) {
      return;
    }
    const atualizado: SessionUser = { ...atual, biometria: ativo };
    this.session.set(atualizado);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(atualizado));
    } catch {
      // localStorage indisponível (testes) — segue
    }
  }

  loginDemo(): Observable<SessionUser> {
    return this.completeLogin(
      createUser(environment.demoEmail, 'Usuário Demo', { provedor: 'demo' }),
    );
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // localStorage indisponível (testes) — segue
    }
  }

  private completeLogin(user: SessionUser): Observable<SessionUser> {
    this.session.set(user);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // localStorage indisponível (testes) — segue
    }
    return of(user);
  }
}

function signIn(
  client: SupabaseClient | null,
  email: string,
  password: string,
): Promise<SessionUser> {
  if (!client) {
    return Promise.reject(new Error('Supabase indisponível'));
  }
  return client.auth.signInWithPassword({ email, password }).then(({ data, error }) => {
    if (error || !data.user) {
      throw error ?? new Error('Falha ao autenticar');
    }
    const meta = data.user.user_metadata ?? {};
    return createUser(data.user.email ?? email, meta['nome'] as string | undefined, {
      cpf: meta['cpf'] as string | undefined,
      nascimento: meta['nascimento'] as string | undefined,
      provedor: 'senha',
    });
  });
}

function signUp(client: SupabaseClient | null, payload: SignupPayload): Promise<void> {
  if (!client) {
    return Promise.reject(new Error('Supabase indisponível'));
  }
  return client.auth
    .signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.senha,
      options: {
        data: { nome: payload.nome, cpf: payload.cpf, nascimento: payload.nascimento },
      },
    })
    .then(({ error }) => {
      if (error) {
        throw error;
      }
    });
}

function signInWithGoogle(client: SupabaseClient | null): Promise<SessionUser> {
  if (!client) {
    return Promise.reject(new Error('Supabase indisponível'));
  }
  return client.auth
    .signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    .then(({ error }) => {
      if (error) {
        throw error;
      }
      // O redirect assume o fluxo; esta sessão só existe no modo demo.
      return createUser('usuario.google@gmail.com', 'Usuário Google', { provedor: 'google' });
    });
}

function enrollMfa(client: SupabaseClient | null): Promise<MfaEnrollment> {
  if (!client) {
    return Promise.reject(new Error('Supabase indisponível'));
  }
  return client.auth.mfa.enroll({ factorType: 'totp' }).then(({ data, error }) => {
    if (error || !data) {
      throw error ?? new Error('Falha ao iniciar o 2FA');
    }
    return {
      fatorId: data.id,
      uri: data.totp.qr_code,
      segredo: data.totp.secret,
      demo: false,
    };
  });
}

/** Provisioning TOTP gerado localmente — suficiente para a demonstração. */
function enrollMfaDemo(email: string): MfaEnrollment {
  const segredo = gerarSegredoBase32(16);
  const issuer = encodeURIComponent('Ledger Bank');
  const conta = encodeURIComponent(email);
  return {
    fatorId: 'demo-totp',
    uri: `otpauth://totp/${issuer}:${conta}?secret=${segredo}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
    segredo,
    demo: true,
  };
}

const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function gerarSegredoBase32(tamanho: number): string {
  let saida = '';
  for (let i = 0; i < tamanho; i++) {
    saida += ALFABETO_BASE32[Math.floor(Math.random() * ALFABETO_BASE32.length)];
  }
  return saida;
}

/** `true` quando o navegador expõe a API de credenciais (WebAuthn). */
export function biometriaSuportada(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}

export function createUser(
  email: string,
  name?: string,
  extra: Partial<Pick<SessionUser, 'cpf' | 'nascimento' | 'mfa' | 'biometria' | 'provedor'>> = {},
): SessionUser {
  const normalized = email.trim().toLowerCase();
  const display =
    name ??
    normalized
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return { email: normalized, name: display, createdAt: Date.now(), ...extra };
}

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as SessionUser;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

/** Reexportado para a tela de cadastro decidir entre Supabase e modo demo. */
export type { ProvedorAuth };
