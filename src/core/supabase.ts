import { Injectable, computed, signal } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, temSupabase } from './config';

const CHAVE_CLIENTE = 'zecki1-supabase';

/**
 * Cliente unico do projeto Supabase compartilhado (jlvqrfewiuqhduvbufqe).
 *
 * A sessao fica em localStorage para sobreviver a F5, e o RLS e quem protege
 * os dados — a anon key pode ir no bundle, a service_role key nunca.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly _pronto = signal(false);
  private readonly _erro = signal<string | null>(null);
  readonly cliente: SupabaseClient | null;

  readonly pronto = this._pronto.asReadonly();
  readonly erro = this._erro.asReadonly();
  readonly modoDemo = computed(() => !temSupabase());

  constructor() {
    if (!temSupabase()) {
      this._erro.set(
        'Supabase nao configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env. O app segue em modo demo.',
      );
      this.cliente = null;
      return;
    }

    this.cliente = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { storageKey: CHAVE_CLIENTE, persistSession: true, autoRefreshToken: true },
    });
    this._pronto.set(true);
  }

  /** True quando o projeto respondeu o ping de auth — usado no health-check. */
  async verificarConexão(): Promise<boolean> {
    if (!this.cliente) return false;
    const { error } = await this.cliente.auth.getSession();
    return !error;
  }
}
