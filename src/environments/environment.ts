import { ambienteLocal } from './ambiente.local';

/**
 * Contrato de ambiente único do app.
 *
 * Os valores vêm de `src/environments/ambiente.local.ts`, gerado por
 * `scripts/gerar-ambiente.mjs` a partir de `.env` e das variáveis do processo
 * (Vercel/CI). O arquivo gerado é gitignored — nenhuma chave real entra no repo.
 *
 * Ausência de URL/anon key = modo demo: o app sobe com o seed local e nunca
 * quebra por falta de credencial.
 *
 * O objeto é mutável de propósito: os specs sobrescrevem URL/anon key para
 * exercitar os dois ramos. Em código de produção ele é só leitura.
 */
export const environment = {
  production: true,
  supabaseUrl: ambienteLocal['VITE_SUPABASE_URL'] ?? '',
  supabaseAnonKey: ambienteLocal['VITE_SUPABASE_ANON_KEY'] ?? '',
  supabaseSchema: ambienteLocal['VITE_SUPABASE_SCHEMA'] ?? 'public',
  role: ambienteLocal['VITE_ROLE'] ?? 'demo',
  // Cotações: BrAPI (brapi.dev) é a única opção gratuita que responde com
  // CORS liberado e cobre tickers brasileiros sem proxy. Sem token a API aceita
  // UM ticker por requisição, com 20 req/min e concorrência 1 — daí a fila
  // serial e o cache no MarketService.
  brapiBaseUrl: ambienteLocal['VITE_BRAPI_BASE_URL'] || 'https://brapi.dev/api',
  brapiToken: ambienteLocal['VITE_BRAPI_TOKEN'] ?? '',
  clarityProjectId: ambienteLocal['CLARITY_PROJECT_ID'] ?? '',
  demoEmail: 'user@demo.dev',
};

/** Sem URL ou sem anon key não há backend: a app roda no seed de demonstração. */
export const temSupabase = (): boolean =>
  environment.supabaseUrl.length > 0 && environment.supabaseAnonKey.length > 0;
