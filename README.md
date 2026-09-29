# Ledger — angular-ledger-bank

> Semana(s): 3 · Pilar: **Dashboard** · Teste unitário: **Vitest** · Milestone(s): `m1-ledger`
> Repo público: [github.com/zecki1/angular-ledger-bank](https://github.com/zecki1/angular-ledger-bank)

## Objetivo de entrevista

transformar dados bancários em UX: saldo, timeline de transações, charts e dark mode

## Stack

- **Angular 22** — standalone, signals, zoneless, OnPush por padrão
- **Supabase** — Postgres + Auth + RLS (projeto compartilhado `angular-portfolio`)
- **Tailwind CSS** · **ECharts** (dashboards) · **GSAP** (motion) · **three.js** (3D)
- **Vercel** — build estático (sem cold start, sempre online)

## Fluxo de trabalho (Git)

Ambientes preservados em **português brasileiro** (commits, PRs, issues, CI).

```
main      → produção (build estático; nunca push direto)
homolog   → validação/release de PRs (staging)
develop   → integração diária (merges das branches feat/*)
feature   → feat/<assunto> + PR para develop (boas práticas de código limpo)
```

- **Commits:** `feat:`, `fix:`, `test:`, `docs:`, `design:`, `ops:`, `backend:` (conventional commits)
- **PRs:** sempre via **pull request template**; revisados e mergeados por milestone
- **main:** protegida — merge somente via PR de `homolog`
- Rastreabilidade com issues, labels (`feat/test/design/ops/backend`), milestones e releases

## Rodando localmente

```bash
npm install
npm start            # ng serve
npm test             # unitário (Vitest)
npm run test:ci      # unitário em modo CI (coverage)
npm run e2e          # Playwright (local)
npm run e2e:ci       # Playwright (CI)
npm run build        # ng build
npm run analyze      # source-map-explorer (análise de bundle)
```

## Ambiente (Supabase)

Variáveis em `.env` (nunca commitadas). `scripts/gerar-ambiente.mjs` transforma
`VITE_*` em `src/environments/ambiente.local.ts` no `prestart`/`prebuild`/`pretest`
— o arquivo gerado é gitignored, então **nenhuma chave real entra no git**.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ROLE=demo
```

Dados usados: profiles (user/viewer) + accounts + transactions

**Modo demo**: sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` o app sobe com um
seed local (~40 transações ancoradas em "hoje") e nunca quebra por falta de
credencial. Ver [`supabase/migrations/`](./supabase/migrations) para o schema e as
policies de RLS.

## Hub de Integrações (quadros no estilo monday)

A engrenagem no shell abre `/integracoes`, que não é um formulário de configurações
e sim um **conjunto de quadros**, cada um lazy e independente:

| Aba | Rota | O que resolve |
|---|---|---|
| Visão geral | `/integracoes/visao-geral` | patrimônio, P&L, variação do dia, curva e alocação |
| Investimentos | `/integracoes/investimentos` | posições, filtro por classe, série histórica por período |
| Cotações | `/integracoes/cotacoes` | busca de ticker, maiores altas/quedas, tabela com origem do dado |
| Conexões | `/integracoes/conexoes` | quem está ligado, o que exige login, o que vem do ambiente |
| Configurações | `/integracoes/configuracoes` | tema, moeda, exportação CSV, atalhos |

O padrão é o do monday: navegação por abas no topo, cada quadro com o seu próprio
estado. A pasta `features/integrations/` tem um componente por quadro e a rota pai
só cuida das abas + `<router-outlet>`.

### Cotações: BrAPI

Escolhi a [BrAPI](https://brapi.dev) depois de medir o comportamento real da API
(`curl` + headers), não pela documentação. Três restrições moldaram o
`MarketService`:

1. **Um ticker por requisição** sem token — lote (`?tickers=PETR4,VALE3`) responde
   `MISSING_TOKEN`. E `x-brapi-concurrency-limit: 1`: disparar seis em paralelo toma
   429 na cara do usuário. Por isso o serviço tem **fila estritamente serial** com
   350 ms de espaçamento entre chamadas.
2. **20 requisições por minuto** no plano anônimo. Daí o cache de 60 s e o
   espaçador: abrir a tela doze vezes não pode virar doze requisições.
3. **CORS liberado** (`access-control-allow-origin: *`) — nenhum proxy necessário.

```bash
VITE_BRAPI_BASE_URL=https://brapi.dev/api
VITE_BRAPI_TOKEN=            # opcional: libera lote e mais volume
```

**O app nunca mostra número inventado como se fosse de mercado.** Toda
`QuoteResult` carrega `origin: 'ao_vivo' | 'cache' | 'demo'`, exibido como tag na
tabela. Quando a chamada falha (offline, 429, ticker inexistente), o serviço cai num
seed determinístico — o mesmo ticker sempre gera o mesmo preço, então a tela não
"pisca" de valor a cada render — e a visão geral mostra um aviso explícito de modo
demonstração.

O seed de carteira (`HOLDINGS_DEMO` em `portfolio.service.ts`) é o motivo de o
`origin` existir: seis posições × (cotação + série) = doze requisições por carga,
perto do teto anônimo. É por isso que a tela de investimentos não recarrega as
séries a cada montagem.

## Arquitetura

```
src/app/
├─ core/                 # singletons: sem UI, sem rota
│  ├─ echarts.ts         # registro modular do ECharts (linha, barra, rosca)
│  ├─ guards/            # authGuard
│  ├─ services/          # AuthService · LedgerDataService · ThemeService
│  │                     # MarketService · PortfolioService · IntegrationsService
│  │                     # supabase-client
│  ├─ utils/             # format (BRL, datas, filtro, CSV, mercado) · chart-theme
│  └─ models.ts
├─ features/             # lazy por rota, uma pasta por página
│  ├─ login/  dashboard/  transactions/  account/
│  └─ integrations/      # layout + 5 quadros
└─ shared/components/    # shell · balance-card · chart · transaction-list · pagination
```

- **Guard no pai das rotas protegidas** (`canActivate` em `path: ''`): uma regra
  só, e `login` fica fora dela.
- **`withComponentInputBinding()`** liga o `:id` da rota direto no `input()` do
  `AccountDetailPage` — sem subscribe manual de `ActivatedRoute`.
- **Rollup não sabe tree-shakar o SDK do Supabase**; com import estático ele entra
  inteiro no bundle inicial (≈870 kB de fonte: `auth-js`, `postgrest-js`,
  `realtime-js`, `storage-js`, `phoenix`). Como o modo demo não usa backend, o
  `supabase-client.ts` faz `import()` dinâmico: **o SDK vira um chunk sob demanda**.
- **`IntegrationsService` separa "conectado" de "conectável".** O Supabase tem
  `doAmbiente: true`: o estado vem de `VITE_SUPABASE_URL`, então a tela mostra o
  status e **não** oferece botão — antes ele aparecia e `alternar()` era no-op, ou
  seja, um botão que não fazia nada. As demais conexões persistem em `localStorage`.

## Bundle

| | Antes | Depois | Com integrações |
|---|---|---|---|
| Bundle inicial (raw) | 514 kB | **298 kB** | **307 kB** |
| Bundle inicial (transfer) | 126 kB | **80 kB** | **83 kB** |
| Chunk do ECharts | 1,05 MB | **476 kB** | **524 kB** |

Duas mudanças, ambas por decisão e não por acidente:

1. **ECharts modular** — `echarts/core` com registro de `LineChart`, `BarChart`,
   `PieChart`, `GridComponent`, `TooltipComponent`, `LegendComponent` e
   `CanvasRenderer`. `import { init } from 'echarts'` traz a lib inteira; o registro
   mínimo corta o chunk pela metade.
2. **Supabase lazy** — o SDK só é baixado quando há credencial configurada.

Os +9 kB iniciais são o `BarChart`/`PieChart`/`LegendComponent` do registro do ECharts
— que moram no **chunk lazy** de 524 kB, não no first load. Os quadros de
investimentos, cotações e conexões são 7–10 kB cada, baixados só quando abertos.

Orçamento em `angular.json`: 350 kB (warning) / 450 kB (erro) no initial, 8/16 kB
por estilo de componente. Escolhi números **a partir do tamanho real medido** — um
orçamento irreal (menor que o baseline do Angular) só gera ruído no CI.

## Temas (claro/escuro)

Tokens semânticos em `src/styles.css`, com a paleta trocando por seletor de
classe (`.dark` no `<html>`), não por `prefers-color-scheme` — é o que permite o
toggle manual que a spec pede:

```css
@theme  { --color-surface: var(--surface); ... }  /* gera as utilitárias */
:root  { --surface: #ffffff; }                    /* claro  */
.dark  { --surface: #14141b; }                    /* escuro */
```

O ECharts desenha em canvas e **não herda CSS**, então `chart-theme.ts` lê os
mesmos tokens com `getComputedStyle` e o `Chart` reaplica a série quando o tema
muda. Um script inline no `index.html` aplica a classe antes da primeira pintura
(sem flash de tema).

## Decisão de teste: Vitest

Vitest em vez de Karma por três motivos concretos: o builder `@angular/build:unit-test`
do Angular 22 já roda Vitest de forma nativa (zero adapter, `ng test` e a CI usam o
mesmo caminho); `vi.mock` intercepta o `import()` dinâmico do Supabase, o que
deixa o ramo "com credenciais" testável de verdade; e a saída é compatível com o
`@vitest/coverage-v8` já usado. A suíte roda em ~1,6 s.

> Cada repo do roadmap alterna Karma/Vitest de propósito: agnóstico de ferramenta,
> escolha por contexto.

## Checklist DoD

- [x] Build/lint/typecheck limpos
- [x] Unit (Vitest) — **176 testes** em 22 arquivos, cobertura **94,5% stmts / 95,4% linhas**
- [x] E2E Playwright (28) + axe sem violações serious/critical
- [x] Cotações reais via BrAPI com fila serial, cache e origem do dado explícita
- [ ] Lighthouse ≥ 90 (fica para a Semana 10, na trilha de performance do roadmap)
- [x] Responsivo (shell com sidebar em `lg`, header compacto abaixo)
- [x] README com decisão de teste e "o que aprendi"
- [x] Supabase configurado (schema + RLS em `supabase/migrations`, com fallback demo)
- [ ] PR revisado + merged + release por milestone

## O que aprendi

**Bundle não é "rodar `npm run build` e ver o número".** Os 514 kB iniciais eram
quase todos `@supabase/supabase-js`, e o culpado parecia óbvio demais para ser
interessante: o app rodava 100% em modo demo. A correção não foi "remover o
Supabase" (ele é o objetivo do projeto) e sim perceber que **tree-shaking não
alcança o SDK inteiro**, então a pergunta certa é *quando* o app precisa dele — e a
resposta é "só com credencial". Isso virou `import()` dinâmico, 216 kB a menos no
first load.

**Tokens de tema fora do `@theme` existem mas não fazem nada.** O dark/light
"funcionava": as classes apareciam nos templates e a página renderizava. Mas
`bg-surface` e `text-mute` nunca foram geradas, porque no Tailwind v4 utilitárias
só nascem de tokens declarados em `@theme` — nada herdava o CSS, o texto ficava
branco sobre branco, e o botão de primária ficava transparente. **Nem os testes
unitários pegaram isso**: eles não verificam pixels. Só o axe no E2E, reclamando de
contraste `1.09:1` de um botão "Exportar CSV" que estava sem fundo, expôs o
problema. A lição é sobre o *tipo* de teste: a11y automatizada é um detector de
regressão visual melhor do que a maioria dos devs assume.

**Duas falhas que só o tempo/fuso revelam.** `dayKey` truncava com
`toISOString().slice(0,10)`, ou seja, em **UTC** — e reconverter essa string
novamente para data local voltava um dia em fusos negativos (UTC-3 no Brasil). O
extrato agrupava "hoje" como "ontem" e o eixo do gráfico saía um dia adiantado. A
assinatura está em `format.spec.ts`/`ledger-data.service.spec.ts` com invariantes
que valem em qualquer fuso, não com uma data fixa. E `takeUntilDestroyed()` sem
`DestroyRef` explícito lançou `NG0203` assim que o handler foi chamado fora do
contexto de injeção — o template às vezes provide, o teste não, e isso vira bug
"só em produção" do tipo oposto.

**`toHaveClass` do Playwright é mais um professor que o build.** A duplicação de
"Saldo consolidado" (sidebar + dashboard) não era bug de UI, era um teste
escrito contra uma versão anterior da tela. O conserto certo foi tornar o landmark
`<main>` explícito e escopar o seletor — não afrouxar a asserção.

**Limitação de API se descobre no `curl`, não na documentação.** A BrAPI tem CORS
liberado e um plano anônimo utilizável, mas o header `x-brapi-concurrency-limit: 1`
e o `MISSING_TOKEN` em lote não estão na página inicial. Fui medir antes de
escrever o serviço, e foi isso que evitou o erro óbvio: `Promise.all` dos seis
tickers, que no happy path do mock passa e em produção vira 429 em loop. O teste
que vale não é "a cotação volta certa", é **"nunca houve duas requisições ao mesmo
tempo"** — está em `market.service.spec.ts` medindo concorrência máxima.

**Fallback silencioso é pior que erro barulhento.** O seed determinístico
(`pseudoRandom` semeado pelo ticker) resolve o caso offline, mas cria uma armadilha:
dados que parecem reais. Por isso cada resposta carrega `origin` e a tela diz se está
em modo demonstração. O mesmo principle apareceu no botão do Supabase: a tela
mostrava "Conectar", o serviço aceitava a chamada e não fazia nada. Foi o E2E
(`conectar-supabase` com count 0) que expôs — **um botão que não faz nada é bug, não
detalhe de UI**, e a correção foi no modelo (`doAmbiente`), não no template.

**`busca.set('')` não limpa um `<input>`.** O binding `[value]` só escreve no DOM
quando o valor que o Angular conhece muda, e eventos de `input` do usuário não
passam pela detecção. Depois de consultar um ticker o campo continuava com o texto
digitado — a tela "funcionava", o estado não. A correção foi limpar pela referência
do template (`#tickerInput`), e o tipo do `Event` no handler deixou de ser `Event`
para receber o elemento.

**Vitest roda em `ng test`, não em `npx vitest`.** Um `vitest.config.ts` com
`environment: 'node'` no repo faz `npx vitest run` reprovar 59 testes com
`localStorage is not defined` — mas o runner real é o builder
`@angular/build:unit-test`, que monta o ambiente de browser sozinho. Config de
teste morta é pior que config ausente: ela ensina o comando errado. Apaguei o
arquivo.

## Screenshots

_(capturar em produção: login, dashboard nos dois temas, transações, extrato,
hub de integrações, quadro de cotações)_

## Microsoft Clarity (mapa de calor)

Integração documentada em [`docs/clarity-integracao.md`](./docs/clarity-integracao.md).
Snippet só é ativado quando a variável `CLARITY_PROJECT_ID` estiver definida.

## Permanência online

Estratégia zero-standby documentada em [`docs/manter-online.md`](./docs/manter-online.md).
