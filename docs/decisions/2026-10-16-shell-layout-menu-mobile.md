# Decisão: layout do Shell — barra lateral fixa e menu hambúrguer no mobile

**Data:** 2026-10-16 · **Projeto:** angular-ledger-bank · **Status:** aplicado

## Contexto

Dois problemas relatados na mesma tela:

1. **Desktop:** o rodapé da barra lateral ("Saldo consolidado", tema, Sair) ia
   **descendo junto com o texto** quando o conteúdo da página era maior que a
   tela, em vez de ficar fixo no pé da barra.
2. **Mobile:** os 5 links de navegação eram renderizados **inline** dentro da
   barra superior. Com o espaço de um celular eles estouravam o layout e
   "ficavam de lado" — não havia menu nenhum, só links espremidos.

## Decisão

### 1. Dois contêineres de rolagem, um por breakpoint

Antes o Shell era `<div class="flex min-h-svh">`: o documento inteiro rolava,
e a `<aside>` simplesmente se esticava junto com o conteúdo mais alto — por isso
o rodapé descia.

Agora:

| | Mobile | Desktop (`lg`) |
| --- | --- | --- |
| Contêiner | `min-h-dvh` (fluxo normal) | `h-dvh` + `overflow-hidden` |
| Quem rola | o `document` | `.min-w-0.flex-1` com `overflow-y-auto` |
| `<aside>` | escondida | altura = viewport; `<nav>` com `overflow-y-auto`, rodapé `shrink-0` |

Assim o rodapé é o **último item flexível** de uma coluna com altura travada:
outra vez que o conteúdo cresce, quem absorve é a área da navegação
(`flex-1 overflow-y-auto`), não o rodapé.

`min-h-dvh` (e não `min-h-svh`) foi escolhido para a barra de endereço do
mobile não cortar o rodapé; `dvh` muda com a barra visível, `svh` não.

### 2. Gaveta de verdade no lugar dos links inline

O header do mobile passou a ter só **marca + tema + botão hambúrguer**
(`☰`/`✕`), e a navegação vive numa gaveta fixa à direita (`.menu-gaveta`):

- `transform: translateX(100%)` → `translateX(0)` na abertura;
- curva `cubic-bezier(0.22, 1, 0.36, 1)`: sai rápido e termina devagar, o que
  dá a sensação "líquida" pedida sem biblioteca nenhuma;
- fundo escurecido com clique para fechar;
- `Escape` fecha (binding `(document:keydown.escape)`).

## Dificuldade 1 — conteúdo fechado não pode ser alcançável

A gaveta fica **sempre no DOM** (senão a transição não teria o que animar).
Mas no mobile também existe a `<aside>` de desktop, que é `hidden` só via CSS —
ou seja, `display:none` já a tirava da árvore de acessibilidade.

A gaveta não: com `transform` ela continua no layout, invisível. Tabs e leitor
de tela alcançariam links "fora da tela".

**Resolução:** `[attr.inert]` quando fechada. `inert` remove o subárvore da
ordem de tabulação **e** da árvore de acessibilidade, e é exatamente a
semântica certa para "existe, mas está fechado". Um teste fixa isso
(`shell.spec.ts` → *começa fechada, fora de foco e fora de leitura*), porque é
o tipo de coisa que regride em silêncio.

### Por que não `@if` (remover do DOM)?

Porque `@if` ao fechar destrói o elemento — sem elemento, não há `transform`
para animar: a gaveta sumiria em vez de deslizar. Manter no DOM + `inert` dá
transição **e** acessibilidade. O `backdrop` recebe o mesmo tratamento.

## Dificuldade 2 — `scrollPositionRestoration: 'top'` parou de funcionar

Efeito colateral direto da decisão 1. O `withInMemoryScrolling({ scrollPositionRestoration: 'top' })`
rola o **document** — e no desktop quem rola agora é a div do conteúdo. Resultado:
vinha de uma página longa, abria `Transações` e o novo componente nascia
"meio rolado" dentro do container, porque o container não foi tocado.

**Resolução:** o Shell observa `NavigationEnd` e zera o
`scrollTop` do `viewChild('conteudo')` — mas **só quando o caminho muda**
(`url.split('?')[0]`). Trocar filtro por query string não deve jogar a lista de
volta pro topo, e esse detalhe só fica visível se estiver testado.

Isso também expôs uma **dificuldade de método**: era um bug invisível para os
testes unitários (eles não têm altura de viewport) e só apareceria em E2E ou
no navegador. A regra do caminho ficou com comentário no próprio código.

## Dificuldade 3 — o roteador também fecha o menu

O `NavigationEnd` fecha a gaveta para cobrir voltar/avançar do navegador. Como
dispara em **toda** navegação (inclusive a inicial), `fecharMenu()` tem guarda
`if (!this.menuAberto()) return;` — sem ela, o `body.classList` de travagem de
scroll seria tocado desnecessariamente a cada rota.

O `ngOnDestroy` remove a classe: sem isso, sair do Shell com o menu aberto
deixaria o `body` travado para sempre (classe que vive fora do componente).

## Onde está o comportamento

- `src/app/shared/components/shell/shell.html` — header, backdrop, gaveta, aside.
- `src/app/shared/components/shell/shell.ts` — `menuAberto`, foco/Escape,
  trava-corpo, rolagem por caminho, e o CSS estrutural na lista `styles`.
- `src/app/shared/components/shell/shell.spec.ts` — 5 testes do menu.

## Alternativas consideradas

- **Menu que expande para baixo do header.** Mais simples, mas empurra o
  conteúdo para baixo e some assim que você navega; a gaveta lateral dá mais
  espaço para os 5 itens + bloco de usuário e fecha em qualquer momento.
- **Remover a gaveta do DOM com `@if`.** Rejeitado — ver Dificuldade 1.
- **Manter `min-h-svh`.** Rejeitado — corta o rodapé atrás da barra de
  endereço no mobile.

## Critérios de aceite

- [x] Rodapé da `<aside>` visível sem rolar em qualquer altura de conteúdo.
- [x] No desktop só o conteúdo rola; no mobile o documento rola.
- [x] Hambúrguer expõe `aria-expanded` + `aria-controls` e tem nome acessível.
- [x] Gaveta fechada carrega `inert`.
- [x] `Escape` e clique no fundo fecham.
- [x] Rota nova nasce no topo; filtro por query não zera a rolagem.
- [x] `ng lint`, `ng build`, `ng test` verdes.
