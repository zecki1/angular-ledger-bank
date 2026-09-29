-- Ledger 0003 — grants p/ transporte (anon + authenticated)
-- Sem estes grants o anon key client leva 42501: permission denied for schema
-- app__ledger_bank (o client com anon key PRECISA de grant usage, mesmo com RLS ativa).
-- RLS permanece intacta (select_own por auth.uid() nas migrations 0001/0002).

-- schema do app — o client (anon/authenticated) precisa conseguir RESOLVER objetos
grant usage on schema app__ledger_bank to anon, authenticated,
                                                       service_role;

-- registry (tabela-macro): leitura liberada p/ qualquer role autenticada (catálogo)
grant select on public.app_registry to anon, authenticated;

-- tabelas do schema do app: somente SELECT (RLS decide o que cada auth.uid() vê)
grant select on app__ledger_bank.accounts      to anon, authenticated;
grant select on app__ledger_bank.transactions  to anon, authenticated;

-- sequences usadas pelos defaults (gen_random_uuid vem de pgcrypto; sem seq própria)
