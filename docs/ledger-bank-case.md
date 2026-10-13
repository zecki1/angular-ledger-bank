# Case study — Ledger

## Contexto

Pilar **Dashboard** do portfólio: um app fictício de finanças pessoais ("Ledger") construído para
provar domínio de **apresentação de dados densos** — saldo, timeline de transações, gráficos e dark
mode — com UX de produto, não de demo.

Stack: Angular 22 (standalone, signals, zoneless, OnPush) + Tailwind 4 + ECharts, Supabase
(Postgres + Auth + RLS) com **fallback demo** e a **BrAPI** para cotações reais.

## Desafio

- Transformar dados bancários densos em leitura rápida, sem virar "planilha com CSS".
- Ter **cotação real** sem backend próprio e sem quebrar quando a API falha ou estoura o limite.
- Entregar dark mode sem "piscar" e com contraste correto nos dois temas.
- Manter o bundle sob controle mesmo com um SDK de backend (Supabase) e uma lib de gráficos (ECharts).

## Solução

- **Hierarquia primeiro:** saldo consolidado, cards de conta e gráfico de fluxo de caixa; o extrato
  agrupa por dia e o gráfico respeita o fuso local (`dayKey` em data local, não UTC).
- **Hub de Integrações em quadros (estilo monday):** `/integracoes` é um conjunto de 5 quadros lazy,
  cada um com estado próprio (visão geral, investimentos, cotações, conexões, configurações).
- **Cotações com honestidade de origem:** o `MarketService` usa fila **serial** (350 ms) por causa do
  `x-brapi-concurrency-limit: 1`, cache de 60 s para o teto de 20 req/min e queda para um **seed
  determinístico** quando a API falha. Toda resposta carrega `origin: 'ao_vivo' | 'cache' | 'demo'`,
  exibida como tag — nenhum número inventado passa por mercado real.
- **Tema por classe:** tokens semânticos em `styles.css` com a paleta trocando por `.dark` no `<html>`
  (não `prefers-color-scheme`), script inline antes da primeira pintura e `chart-theme.ts` relendo os
  tokens com `getComputedStyle` para repintar o canvas do ECharts.
- **Bundle sob controle:** ECharts com registro modular e `supabase-client.ts` com `import()` dinâmico
  (o SDK não é tree-shakável; só baixa com credencial).
- **Qualidade:** ESLint + angular-eslint, 176 testes unitários (Vitest), E2E com Playwright
  (smoke + integrações + axe + screenshots), Lighthouse CI e bots locais (navegação humana + análise
  de erro).
- **Deploy:** GitHub Pages (projeto público), com `--base-href` de project site e fallback SPA via
  `404.html`.

## Métricas

| Métrica | Resultado |
|---------|-----------|
| Testes unitários | 176/176 (22 arquivos) |
| Cobertura | 94,1% statements · 84,9% branches · 95,1% lines |
| E2E (Playwright) | 41/41 (smoke, integrações, axe, screenshots) |
| Acessibilidade (axe) | 0 violações graves/críticas nas 8 telas |
| Lighthouse | Perf 91 · A11y 100 · Boas práticas 100 · SEO 100 |
| Bundle inicial | 308 kB (≈84 kB transfer) |

## O que aprendi

- **Bundle não é "rodar `npm run build` e ver o número".** Os 514 kB iniciais eram quase todos
  `@supabase/supabase-js`, e o culpado parecia óbvio demais: o app rodava 100% em modo demo. A correção
  não foi "remover o Supabase" (ele é o objetivo do projeto) e sim perceber que **tree-shaking não
  alcança o SDK inteiro** — a pergunta certa é *quando* o app precisa dele. Virou `import()` dinâmico.
- **Tokens de tema fora do `@theme` existem mas não fazem nada.** O dark/light "funcionava": as classes
  apareciam no template e a página renderizava, mas `bg-surface`/`text-mute` nunca eram geradas porque no
  Tailwind v4 utilitárias só nascem de tokens declarados em `@theme`. O texto ficava branco sobre branco.
  **Nem os testes unitários pegaram** — só o axe, reclamando de contraste `1.09:1`. A11y automatizada é
  um detector de regressão visual melhor do que a maioria assume.
- **Duas falhas que só o tempo/fuso revelam.** `dayKey` truncava com `toISOString().slice(0,10)` (UTC) e
  a reconversão para data local voltava um dia em UTC-3: o extrato agrupava "hoje" como "ontem". A
  assinatura está em `format.spec.ts` com invariantes que valem em qualquer fuso, não com data fixa.
- **Limitação de API se descobre no `curl`, não na documentação.** O `x-brapi-concurrency-limit: 1` e o
  `MISSING_TOKEN` em lote não estão na página inicial da BrAPI. O teste que vale não é "a cotação volta
  certa", é **"nunca houve duas requisições ao mesmo tempo"** (`market.service.spec.ts`).
- **Fallback silencioso é pior que erro barulhento.** O seed determinístico resolve o offline, mas cria
  dados que parecem reais. Por isso cada resposta carrega `origin` e a tela diz que está em modo
  demonstração. O mesmo apareceu num botão "Conectar Supabase" que não fazia nada: o conserto foi no
  modelo (`doAmbiente`), não no template — **um botão que não faz nada é bug, não detalhe de UI**.
- **`busca.set('')` não limpa um `<input>`.** O binding `[value]` só escreve no DOM quando o valor que o
  Angular conhece muda; após consultar um ticker o campo continuava preenchido. A correção foi limpar
  pela referência do template (`#tickerInput`).

## Links

- Demo: https://zecki1.github.io/angular-ledger-bank/
- Repo: https://github.com/zecki1/angular-ledger-bank
