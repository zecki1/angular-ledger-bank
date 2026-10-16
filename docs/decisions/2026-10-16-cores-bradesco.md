# Decisão: troca da paleta roxo (Nubank) para as cores do Bradesco

**Data:** 2026-10-16 · **Projeto:** angular-ledger-bank · **Status:** aplicado

## Contexto

A identidade visual até aqui era roxa (`#5c2bd6` / `#8b5cf6`) — escolha herdada do
Nubank. O pedido foi passar para as cores do Bradesco. A troca não é só trocar
hex: os tokens de marca são usados como **preenchimento** (botões, chip do link
ativo) e como **texto** (links, hover, contorno de foco), e as duas funções têm
restrições de contraste opostas.

Também existe um conflito estrutural: em UI financeira vermelho significa
**valor negativo** (`--down`), e o Bradesco é vermelho.

## Cores escolhidas

Consulta ao acervo público de marca (Brandfetch) devolve para o Bradesco:

| Cor | Hex | Uso aqui |
| --- | --- | --- |
| Monza (vermelho) | `#CC092F` | `--brand` |
| Mandy (vermelho claro) | `#E6485E` | referência para o hover do tema escuro |
| Chambray (azul) | `#333B8F` | cor da conta no seed e no fallback |
| Amarelo | `#FFED00` | `--accent` (marca gráfica) |

Decisão de tokens, com os dois modos:

| Token | Claro | Escuro | Papel |
| --- | --- | --- | --- |
| `--brand` | `#cc092f` | `#cc092f` | preenchimento (botão primário, chip da marca) |
| `--brand-soft` | `#a80726` | `#ff7d8e` | **texto/contorno** (link ativo, foco, hover de texto) |
| `--brand-hover` | `#b00a29` | `#d91e3e` | **fundo de hover** sob texto branco |
| `--brand-bg` | `#fdedef` | `#3a0a14` | tinta fraca de fundo |
| `--accent` | `#ffed00` | `#ffe600` | amarelo da marca, só decorativo |

## Dificuldade 1 — `--brand-soft` com dois papéis conflitantes

`--brand-soft` era usado **ao mesmo tempo** como texto e como fundo de hover
(`.btn-primary:hover { background: var(--brand-soft) }`, e 4 botões
`hover:bg-brand-soft` em login/cadastro) — sempre sobre `color: white`.

No roxo isso "passava porque funcionava": `#7c4dff` sobre branco dá ~4,3:1.
No vermelho do Bradesco viraria um problema real:

- como **texto** no tema claro ele precisa ser escuro para passar em AA;
- como **fundo** ele precisa deixar o texto branco legível — também escuro no
  claro, mas **claro** no escuro (para o texto não ser escuro sobre fundo escuro).

As duas exigências se contradizem no tema escuro: `#ff7d8e` como texto dá 7,5:1
(no fundo escuro, ótimo), mas texto branco sobre `#ff7d8e` dá 2,4:1 (péssimo).

**Resolução:** separar em dois tokens. `--brand-soft` virou só texto/contorno e
`--brand-hover` passou a cuidar do fundo. O valor do hover foi escolhido de
forma explícita nos dois modos:

- claro `#b00a29` → texto branco a 7,2:1;
- escuro `#d91e3e` → texto branco a 5,0:1 **e** contraste de 3,7:1 contra a
  superfície escura (janela entre 0,12 e 0,18 de luminância: precisa deixar o
  branco passar e ao mesmo tempo não sumir com o fundo).

## Dificuldade 2 — vermelho da marca × vermelho do negativo

`--down` continua vermelho (`#b91c1c`) e `--brand` também é vermelho. Era o
conflito mais provável desta troca.

Como o Bradesco no mundo real convive com isso no próprio app (botão vermelho
ao lado de número vermelho), a decisão foi **manter a convenção financeira** e
mitigar em vez de trocar o `--down` por outra cor:

- todo valor negativo aparece com sinal explícito (`−R$ …`);
- negativo tem chip de fundo próprio (`--down-bg`);
- `--brand` aparece quase só como preenchimento de controle interativo, e
  `--down` quase só como texto de dado;

Diferença que sobra: no escuro não há ambiguidade (`--brand: #cc092f` é bem
mais escuro que `--down: #f87171`). No claro elas ficam próximas — limitação
aceita e documentada aqui para que a decisão seja consciente, não acidental.

## Dificuldade 3 — amarelo Bradesco não serve como cor de texto

`#ffed00` sobre branco dá ~1,1:1: invisível. Por isso `--accent` ficou
**restrito a elementos decorativos** (a marca gráfica) e nunca aparece como
texto, borda informativa ou indicador de estado. Foi registrado em `@theme` como
`--color-accent` só para o utilitário `bg-accent`.

## A marca gráfica

O ponto único da logo virou duas bolinhas sobrepostas — vermelha (`bg-brand`) e
amarela (`bg-accent`) —, que remetem ao símbolo do Bradesco sem exigir arquivo
de imagem. O `box-shadow` usa `var(--color-surface)` para separá-las, então
funciona igual no tema claro e no escuro.

## Onde a cor aparece fora do `styles.css`

O ECharts não herda CSS, mas `readChartPalette()` lê os tokens em tempo de
execução, então os gráficos acompanham a troca sozinhos. Restaram só valores
**hardcoded** apontando para o roxo, todos atualizados:

| Arquivo | Antes | Depois |
| --- | --- | --- |
| `core/utils/chart-theme.ts` (`FALLBACK`) | `#8b5cf6` | `#cc092f` |
| `core/services/demo-data.ts` (conta corrente) | `#8b5cf6` | `#333b8f` |
| `core/services/ledger-data.service.ts` (fallback) | `#8b5cf6` | `#333b8f` |
| `core/services/portfolio.service.ts` (`CLASS_COLOR.acao`) | `#8b5cf6` | `#cc092f` |
| `features/dashboard/dashboard-page.ts` (comentário) | cita o hex | comentário genérico |
| `shared/components/balance-card/balance-card.spec.ts` (fixture) | `#8b5cf6` | `#333b8f` |

As demais cores de classe de ativo (`fii`, `renda_fixa`, `cripto`…) ficaram
como estavam: são paleta **categorial de dado**, não identidade de marca.
Trocar isso junto inflaria o diff sem ganho — e `acao: #cc092f` já foi escolhido
com cuidado para não colidir com `--down` na mesma rosca.

## Alternativas consideradas

- **Usar o azul Bradesco (`#333b8f`) como marca.** Resolveria o conflito com
  `--down` de vez. Rejeitado: o pedido foi explicitamente pelas cores do
  Bradesco, e o vermelho é a identidade de consumo do banco; o azul entra onde
  ele é mais usado no próprio banco (contas), não na marca.
- **Trocar `--down` para laranja/outra cor.** Rejeitado: quebraria a convenção
  universal de financeiro em que o usuário lê "vermelho = perda" sem ler nada.
- **Fazer `--brand-soft` um único valor.** Impossível, ver Dificuldade 1.

## Critérios de aceite

- [x] `--brand`, `--brand-soft`, `--brand-hover` presentes nos dois temas.
- [x] Texto branco sobre `bg-brand` ≥ 4,5:1 nos dois temas.
- [x] `text-brand-soft` ≥ 4,5:1 contra o fundo de cada tema.
- [x] Nenhum hex roxo restante em `src/` (fora comentários/fixture).
- [x] `bg-accent` nunca usado com texto por cima.
- [x] `ng lint`, `ng build` e `ng test` verdes.

## Próximos passos opcionais

- Se o conflito vermelho-do-brand × vermelho-do-negativo incomodar na prática,
  a saída documentada é usar `--accent` (amarelo) como indicador de estado
  positivo de marca (link ativo, aba selecionada) e reservar vermelho só para
  dado.
