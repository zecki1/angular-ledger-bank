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

Adicionar dependência: `@motionone/angular@^12.2.0` no `package.json`. Nas telas da análise de gastos (tabs, cards, transições entre abas), usar diretivas do Motion One (`m-animate`, `m-fade`, `m-slide`, etc.), verificando `prefers-reduced-motion` (Motion One já trata; também podemos condicionar manualmente quando necessário).

## Desafios previstos

- Garantir que animações não interfiram com foco/visibilidade.
- Evitar animações em elementos interativos que prejudiquem acessibilidade.
- Manter animações curtas e suaves.

## Decisão

Adotar `@motionone/angular` para as animações da análise de gastos.
