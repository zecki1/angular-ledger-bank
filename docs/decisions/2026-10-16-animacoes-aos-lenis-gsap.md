# Decisão: bibliotecas de animação de scroll e transição (AOS, Lenis, GSAP)

**Data:** 2026-10-16 · **Projeto:** angular-ledger-bank · **Status:** decidido, não adicionado

## Contexto

Depois de montar a base de animações com Motion One
(`2026-10-16-liquid-motion.md`), surgiu a sugestão de usar **AOS** ou
**Lenis + GSAP** para deixar as transições "mais bonitas".

O projeto já tem uma restrição nova relevante: o layout passou a ter **dois
contêineres de rolagem** — no desktop a página inteira é `lg:h-dvh
lg:overflow-hidden` e quem rola é a div do conteúdo. Isso muda a conta para
qualquer biblioteca que assuma que quem rola é o `document`.

## Alternativas consideradas

| | O que traz | Custo | Encaixa aqui? |
| --- | --- | --- | --- |
| **AOS** | Animações de entrada ao rolar via `data-aos` | ~5 KB | **Não.** É exatamente o papel que o Motion One já cobre. Esconde o elemento até o JS rodar: sem JS ou com falha, o conteúdo fica invisível (risco de a11y e de "não vi nada"). Não faz transição entre rotas nem layout animation (FLIP). Duas bibliotecas para o mesmo trabalho. |
| **Lenis** | Scroll com inércia / smoothing | ~5 KB | **Agora, não.** Só traz algo que o Motion One não traz. Mas: (a) precisa ser instado **no elemento certo** — no desktop quem rola não é o `document`, é a div do conteúdo, então o padrão `new Lenis()` no body simplesmente não faria nada; (b) atrapalha rolagem por teclado, âncoras (`#conteudo` do "pular para o conteúdo"), `scrollTo` do router e leitores de tela; (c) em telas pequenas já é nativo. |
| **GSAP** (+ Flip/MorphSVG) | Timelines, morfismo SVG, controle fino | ~8–25 KB | **Só se precisarmos.** Hoje é imperativo: precisa de disciplina para não brigar com `OnPush`/signals e para respeitar `prefers-reduced-motion` na mão. Vale quando houver um caso concreto que Motion One não resolve (ex.: morfar um card numa página inteira). |
| **CSS View Transitions** | Cross-fade/slide entre rotas, nativo do navegador | 0 KB | **Melhor custo/benefício** — ver "Decisão". |

## Decisão

**Não adicionar nenhuma das três agora.** Ordem de prioridade:

1. **Motion One** (já no projeto, via wrapper `appMotion`) — entrada de
   elementos, layout animation e microinterações. Não há sobreposição a
   resolver, então AOS é redundante.
2. **CSS View Transitions para troca de rota** — próximo passo. Um
   `withViewTransitions()` em `app.config.ts` mais um par de regras
   `::view-transition-old/new` dá a sensação de continuidade entre telas com
   **zero dependência** e sem JS extra. Escolhido justamente por ser a
   alternativa "leve" que a sugestão pedia, sem custo de bundle.
3. **Lenis** fica registrado como *opcional*, com duas condições para ser
   reavaliado: (a) ser configurado no elemento que realmente rola em cada
   breakpoint (o `viewChild('conteudo')` do Shell), e (b) ser desligado sob
   `prefers-reduced-motion` e em dispositivo de ponteiro `coarse`.
4. **GSAP** fica como *ferramenta para caso específico*, não como base.

## Dificuldade 1 — quem é o "scroll container"?

Qualquer suavizador de scroll assume um alvo. Antes desta decisão o alvo era o
`document`; depois do layout de sidebar fixa o alvo mudou por breakpoint:

- **mobile:** `document` (o header é sticky e a página inteira rola);
- **desktop:** a div `.min-w-0.flex-1` com `lg:overflow-y-auto`.

Um Lenis padrão rodando no `body` estaria animando um elemento que **não rola**,
dando a impressão de "não funcionou" sem erro nenhum. Registramos isto aqui
porque é exatamente o tipo de problema que só aparece ao testar de verdade.

## Dificuldade 2 — `prefers-reduced-motion` tem que ser respeitado por duas vias

O bloco global de `styles.css` já zera `transition-duration`/`animation-duration`
para quem pede movimento reduzido — isso cobre CSS **e** o Motion One (que
nasceu com suporte a isso). Bibliotecas que animam via JS puro (AOS, GSAP)
ficam **fora** desse guarda-chuva e exigem checagem manual de
`matchMedia('(prefers-reduced-motion: reduce)')` em cada chamada. Mais um
custo implícito para as duas opções.

## Critérios para reconsiderar

- Adicionar **Lenis** só se a sensação de rolagem for pedida de novo **e**
 *pudermos* ligá-lo ao elemento de scroll de cada breakpoint; medir antes e
  depois em `lighthouse` (CLS/INP), porque suavizador de scroll é um dos
  protagonistas clássicos de ruído de layout.
- Adicionar **GSAP** só com um caso de uso nomeado (ex.: morfismo entre
  card → página de detalhe) que Motion One não resolva.
- **AOS**: não reavaliar — a função está coberta.

## Próximo passo imediato

Implementar `withViewTransitions()` + CSS de transição de rota, com o
`@media (prefers-reduced-motion: reduce)` desligando a transição, e validar com
os testes E2E (que são os que enxergam navegação real).
