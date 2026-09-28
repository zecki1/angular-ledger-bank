-- Ledger (Semana 3 — Dashboard bancário)
-- Schema do projeto compartilhado angular-portfolio: somente o conjunto usado pelo app.
-- accounts + transactions com RLS por dono (auth.uid()).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
    check (role in ('admin','analyst','user','viewer')),
  name text,
  created_at timestamptz default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  type text check (type in ('conta_corrente','poupanca','cartao_credito','investimentos')),
  balance numeric(14,2) not null default 0,
  currency text not null default 'BRL',
  created_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  type text check (type in ('pix','ted','debito','credito','investimento','pagamento')),
  description text not null,
  amount numeric(14,2) not null,
  direction text check (direction in ('in','out')),
  category text,
  settled_at timestamptz not null default now()
);

create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_settled_idx on public.transactions (settled_at desc);

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.profiles enable row level security;

-- profiles: cada usuário vê apenas o próprio perfil
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- accounts: dono do registro ou admin/analyst
create policy "accounts_select_own" on public.accounts
  for select using (auth.uid() = profile_id);

-- transactions: via conta dona — usuário vê transações das próprias contas
create policy "transactions_select_own" on public.transactions
  for select using (
    exists (
      select 1
      from public.accounts a
      where a.id = transactions.account_id
        and a.profile_id = auth.uid()
    )
  );

-- Contas e transações de exemplo para o user@demo.dev (insira após criar o
-- usuário no dashboard do Supabase; o app também roda com seed local sem conta).
-- insert into public.accounts (profile_id, name, type, balance, currency) values
--   ((select id from auth.users where email = 'user@demo.dev' limit 1), 'Conta Corrente', 'conta_corrente', 8432.70, 'BRL'),
--   ((select id from auth.users where email = 'user@demo.dev' limit 1), 'Poupança', 'poupanca', 23910.15, 'BRL');

-- insert into public.transactions (account_id, type, description, amount, direction, category, settled_at)
-- select a.id, 'credito', 'Salário — Bolts Técnica', 6200, 'in', 'salario', now() - interval '2 days'
-- from public.accounts a where a.name = 'Conta Corrente';