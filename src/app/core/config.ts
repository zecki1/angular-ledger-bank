import { ambienteLocal } from '../../environments/ambiente.local';

export type Papel = 'admin' | 'analyst' | 'user' | 'viewer';

/**
 * Leitura do ambiente gerado. Tudo em um lugar so, para o resto do app nunca
 * tocar em `ambiente.local` diretamente.
 */
export const config = {
  supabaseUrl: ambienteLocal['VITE_SUPABASE_URL'] ?? '',
  supabaseAnonKey: ambienteLocal['VITE_SUPABASE_ANON_KEY'] ?? '',
  projetoSlug: ambienteLocal['VITE_SUPABASE_PROJECT_SLUG'] ?? '',
  papel: (ambienteLocal['VITE_ROLE'] || 'demo') as Papel | 'demo',
} as const;

/** Sem URL ou sem anon key o app roda em modo demo, sem backend. */
export const temSupabase = (): boolean =>
  config.supabaseUrl.length > 0 && config.supabaseAnonKey.length > 0;
