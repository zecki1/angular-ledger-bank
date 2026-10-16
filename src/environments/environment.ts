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
  // API Spring Boot (deploy no Railway) consumida pela demo integrada Java + Angular
  apiBaseUrl:
    ambienteLocal['VITE_API_BASE_URL'] ??
    ambienteLocal['VITE_API_URL'] ??
    'https://java-spring-boot-banking-demo-production.up.railway.app',
  // Cotações: o navegador fala SÓ com a API Java acima. É o Java que fala com a
  // fonte externa (Yahoo Finance), então nenhuma chave de terceiro chega ao
  // frontend e não há mais dependência de CORS/token no cliente.
  clarityProjectId: ambienteLocal['CLARITY_PROJECT_ID'] ?? '',
  demoEmail: 'user@demo.dev',
};

/** Sem URL ou sem anon key não há backend: a app roda no seed de demonstração. */
export const temSupabase = (): boolean =>
  environment.supabaseUrl.length > 0 && environment.supabaseAnonKey.length > 0;
