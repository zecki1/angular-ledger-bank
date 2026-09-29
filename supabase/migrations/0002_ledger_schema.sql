-- Ledger (Semana 3 — Dashboard bancário)
-- Reorganização para projeto compartilhado geolabel/banking-2026:
-- cada app Angular vive em um schema próprio (app__ledger_bank aqui);
-- public.app_registry é a tabela-macro (catálogo) que lista os projetos.
--
-- Este arquivo é 0002 (aplicado após 0001_ledger_schema.sql).
-- Aplica no banco real com:  supabase link --project-ref <REF> && supabase db push
-- Local (sem nuvem) com:     supabase start && supabase db reset
-- (requer Docker — indisponível aqui; migrations prontas p/ quando subir)

-- =====================================================================
-- 1) Tabela-macro / catálogo — um registro por projeto Angular.
--    Usa RLS: qualquer usuário autenticado lê; somente owner/admin escreve.
-- =====================================================================
create table if not exists public.app_registry (
  id uuid primary key default gen_random_uuid(),
  project_key text unique not null,          -- ex.: 'angular-ledger-bank'
  display_name text not null,                -- ex.: 'Ledger Bank'
  app_schema text not null,                  -- schema isolado do app
  environment text not null default 'dev',   -- dev | hom | prod
  owner_id uuid references auth.users(id),   -- responsável pelo projeto
  repo_url text,
  status text not null default 'active'
    check (status in ('active','archived','maintenance')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.app_registry is
  'Tabela-macro: cataloga cada projeto Angular que consome este banco Supabase compartilhado (1 schema por app).';

-- =====================================================================
-- 2) Schema isolado deste app — SÓ este app usa estas tabelas.
-- =====================================================================
create schema if not exists app__ledger_bank;

create table if not exists app__ledger_bank.accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text check (type in ('conta_corrente','poupanca','cartao_credito','investimentos')),
  balance numeric(14,2) not null default 0,
  currency text not null default 'BRL',
  created_at timestamptz default now()
);

create table if not exists app__ledger_bank.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app__ledger_bank.accounts(id) on delete cascade,
  type text check (type in ('pix','ted','debito','credito','investimento','pagamento')),
  description text not null,
  amount numeric(14,2) not null,
  direction text check (direction in ('in','out')),
  category text,
  settled_at timestamptz not null default now()
);

create index if not exists app__ledger_bank_transactions_account_idx
  on app__ledger_bank.transactions (account_id);
create index if not exists app__ledger_bank_transactions_settled_idx
  on app__ledger_bank.transactions (settled_at desc);

-- =====================================================================
-- 3) RLS — mesmas regras do 0001, agora no schema do app.
-- =====================================================================
alter table app__ledger_bank.accounts enable row level security;
alter table app__ledger_bank.transactions enable row level security;

create policy "accounts_select_own" on app__ledger_bank.accounts
  for select using (auth.uid() = profile_id);

create policy "transactions_select_own" on app__ledger_bank.transactions
  for select using (
    exists (
      select 1 from app__ledger_bank.accounts a
      where a.id = transactions.account_id
        and a.profile_id = auth.uid()
    )
  );

create policy "app_registry_select_all" on public.app_registry
  for select using (auth.role() in ('authenticated','anon'));

-- =====================================================================
-- 4) Referência cruzada: registra este app na tabela-macro.
--    owner_id/url vêm do fluxo `supabase link` — preencha quando subir.
-- =====================================================================
insert into public.app_registry (project_key, display_name, app_schema, status)
values ('angular-ledger-bank', 'Ledger Bank', 'app__ledger_bank', 'active')
on conflict (project_key) do nothing;

-- Seed p/ o user@demo.dev (igual ao 0001, agora no schema do app):
-- insert into app__ledger_bank.accounts (profile_id, name, type, balance, currency) values
--   ((select id from public.profiles where id = (select id from auth.users where email = 'user@demo.dev' limit 1)), 'Conta Corrente', 'conta_corrente', 8432.70, 'BRL'),
--   ((select id from public.profiles where id = (select id from auth.users where email = 'user@demo.dev' limit 1)), 'Poupança', 'poupanca', 23910.15, 'BRL');
