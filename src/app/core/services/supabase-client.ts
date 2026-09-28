import type { SupabaseClient } from '@supabase/supabase-js';

import { environment, temSupabase } from '../../../environments/environment';

export { temSupabase };

/**
 * Cliente Supabase carregado sob demanda.
 *
 * O SDK (`@supabase/supabase-js` + auth-js + postgrest-js + realtime-js +
 * storage-js + phoenix) tem ~870 kB de código-fonte. Em modo demo — o padrão
 * quando não há `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` — o app funciona
 * só com o seed local e não precisa do backend.
 *
 * Por isso o `import()` é dinâmico: sem credenciais o SDK nunca entra no bundle
 * inicial, e com credenciais ele vira um chunk sob demanda. O tipo vem de
 * `import type`, que é apagado em compile time e não cria dependência de runtime.
 */
let cached: { key: string; client: Promise<SupabaseClient | null> } | null = null;

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!temSupabase()) {
    return Promise.resolve(null);
  }

  // Memoizado por credencial: trocar URL/anon key/schema (config, HMR ou specs
  // que simulam os dois modos) precisa produzir um cliente novo, não o antigo.
  const key = `${environment.supabaseUrl}|${environment.supabaseAnonKey}|${environment.supabaseSchema}`;
  if (cached?.key !== key) {
    const client = import('@supabase/supabase-js').then(({ createClient }) => {
      // O schema vem do ambiente (string livre), enquanto o 2º genérico do
      // `SupabaseClient` é fixado em "public" quando o Database é `any`. O cast
      // é seguro: o schema já foi validado como string e o Database segue `any`.
      return createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        db: environment.supabaseSchema ? { schema: environment.supabaseSchema } : undefined,
        auth: { persistSession: true, autoRefreshToken: true },
      }) as unknown as SupabaseClient;
    });
    cached = { key, client };
  }
  return cached.client;
}

/** Só para os testes: descarta o cliente memoizado. */
export function resetSupabaseClient(): void {
  cached = null;
}
