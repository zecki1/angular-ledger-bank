# Decisão: Utilização do Motion One para animações no projeto

**Data:** 2026-10-16  
**Autor:** Subagente (Big Pickle)  
**Status:** Aprovado

## Contexto

Foi solicitado iniciar a Fase 1 da análise de gastos. O usuário aprovou o uso de `@motionone/angular` para animações fluidas ("liquid motion") por ser balanceado, leve, Angular-first e respeitar `prefers-reduced-motion`.

## Justificativa

- **Leveza:** Motion One tem footprint pequeno comparado a animações com libs pesadas; foco em performance.
- **Angular-first:** `@motionone/angular` oferece diretivas integradas ao Angular (change detection OnPush, standalone).
- **Acessibilidade:** respeita `prefers-reduced-motion` nativo.
- **Consistência:** alinhado ao estilo do projeto (standalone, signals).
- **Curva baixa:** bom para micro-animações em tabs, cards, listas.

## Alternativas consideradas

- **@angular/animations:** nativo, mas "liquid motion" exige mais código/custom easing/transforms para efeito fluido desejado.
- **GSAP:** muito poderoso, mas maior peso e setup; para micro-animações excessivo.
- **Framer Motion:** não Angular-first.

## Implementação

Adicionar dependência: `@motionone/dom@^10.18.0` no `package.json`. Nas telas da análise de gastos (tabs, cards, transições entre abas), usar Motion One via **diretiva Angular própria** (`appMotion`), verificando `prefers-reduced-motion` (Motion One já trata; também podemos condicionar manualmente quando necessário).

### Dificuldade encontrada: `@motionone/angular` não existe no npm

O plano aprovado previa `@motionone/angular`, mas o pacote **nunca foi publicado**
(`npm view @motionone/angular` → 404). A família `@motionone/*` parau na v10.18.0
(2024-06) e só inclui os pacotes core (`dom`, `animation`, `easing`,
`generators`, `timeline`, `types`, `popcorn`, `color`). A Motion (empresa) seguiu
com o pacote `motion` (v14), que é maior e de outro ecossistema.

**Alternativas consideradas:**

| Alternativa | Prós | Contras | Veredito |
|---|---|---|---|
| `@motionone/angular` (plano original) | API Angular pronta | **Não existe** | Descartada (impossível) |
| `motion` v14 (sucessor) | Mantido, API moderna | ~4× maior, feito p/ React/ecossistema web genérico, sem wrap Angular | Sobrepeso para micro-ânimações |
| `@angular/animations` nativo | Oficial | Não é "liquid motion": sem springs/gestos, boilerplate de módulo | Não atende ao critério aprovado |
| **`@motionone/dom` + diretiva Angular própria** | Core tiny (~5 kB gzip), WAAPI-based, `prefers-reduced-motion` nativo, **Angular-first por construção** (nós escrevemos o wrap com signals/OnPush) | Sem wrapper de terceiros — código nosso (~40 linhas) | **Escolhido** |

A escolha mantém **todos os critérios do aprovado**: leve, balanceado,
Angular-first e respeita reduced motion — só que o wrap Angular passa a ser
nosso (`src/app/shared/directives/motion.directive.ts`), o que também evita
depender de pacote abandonado. Registrado para transparência; se o usuário
preferir o pacote `motion` (v14) é uma troca de uma linha na diretiva.


## Desafios previstos

- Garantir que animações não interfiram com foco/visibilidade.
- Evitar animações em elementos interativos que prejudiquem acessibilidade.
- Manter animações curtas e suaves.

## Decisão

Adotar `@motionone/angular` para as animações da análise de gastos.
