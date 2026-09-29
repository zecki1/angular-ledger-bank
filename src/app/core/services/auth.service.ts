import { Injectable, computed, signal } from '@angular/core';
import { Observable, from, of, switchMap } from 'rxjs';
import type { SupabaseClient } from '@supabase/supabase-js';

import { environment } from '../../../environments/environment';
import { SessionUser } from '../models';
import { getSupabaseClient, temSupabase } from './supabase-client';

const SESSION_KEY = 'ledger:session';

/**
 * Sessão de autenticação. Com Supabase configurado usa signInWithPassword do
 * Auth; sem config, aceita qualquer credencial (modo demo) e persiste em
 * localStorage. `user@demo.dev` é o acesso de demonstração do milestone.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly stored = loadSession();

  readonly session = signal<SessionUser | null>(this.stored);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly userName = computed(() => this.session()?.name ?? '');
  readonly userEmail = computed(() => this.session()?.email ?? '');

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

  loginDemo(): Observable<SessionUser> {
    return this.completeLogin(createUser(environment.demoEmail, 'Usuário Demo'));
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
  return client.auth
    .signInWithPassword({ email, password })
    .then(({ data, error }) => {
      if (error || !data.user) {
        throw error ?? new Error('Falha ao autenticar');
      }
      return createUser(data.user.email ?? email);
    });
}

export function createUser(email: string, name?: string): SessionUser {
  const normalized = email.trim().toLowerCase();
  const display =
    name ??
    normalized
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return { email: normalized, name: display, createdAt: Date.now() };
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
