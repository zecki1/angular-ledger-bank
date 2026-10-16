# Decisão: Fase 1 - Implementação da Análise de Gastos

**Data:** 2026-10-16  
**Autor:** Subagente (Big Pickle)  
**Status:** Em andamento

## Contexto

A Fase 1 da análise de gastos deve ser implementada no `angular-ledger-bank`, com integração prevista ao backend Java (mesmos nomes de campos retornados pela API).

A API Java retorna (conforme especificado):

```json
{
  "mesAtual": "...",
  "entradasMesAtual": 0,
  "saidasMesAtual": 0,
  "saldoMesAtual": 0,
  "comparativo": [
    { "mes": "2026-09", "entradas": 1000, "saidas": 800, "saldo": 200, "variacaoSaidasPercent": -10, "variacaoEntradasPercent": 5 }
  ],
  "recorrentes": [
    { "estabelecimento": "...", "categoria": "...", "tipo": "...", "valorMedio": 100, "quantidadeMeses": 3, "meses": ["2026-09","2026-08"], "totalGasto": 300, "economiaAnualPotencial": 1200 }
  ],
  "sugestoes": [
    { "tipo": "...", "titulo": "...", "descricao": "...", "impactoMensal": 50, "prioridade": "alta" }
  ],
  "transacoesAnalisadas": 10,
  "transacoesAvaliadas": 5
}
```

## Justificativa

Precisamos alinhar modelos Angular exatamente aos nomes do backend. Escolha de arquitetura: componentes standalone, signals, OnPush, seguindo padrão existente (MarketService usa fetch direto; LedgerDataService usa RxJS). Optamos por seguir padrão fetch (como MarketService) para GET simples da análise.

## Decisão sobre Service

Seguir padrão MarketService (fetch direto) para `analise-gastos.service.ts`, chamando `${environment.apiBaseUrl}/api/transacoes/analise`. Ter fallback para estrutura vazia em caso de erro. Isso mantém consistência com o padrão "simples GET" existente.

## Decisão sobre Modelos

Criar `src/app/core/models/analise-gastos.model.ts` com interfaces com nomes exatos do backend (camelCase igual ao JSON). 

Interfaces:
- `ComparativoMensal` com campos: `mes`, `entradas`, `saidas`, `saldo`, `variacaoSaidasPercent`, `variacaoEntradasPercent`
- `GastoRecorrente` com campos: `estabelecimento`, `categoria`, `tipo`, `valorMedio`, `quantidadeMeses`, `meses`, `totalGasto`, `economiaAnualPotencial`
- `SugestaoEconomia` com campos: `tipo`, `titulo`, `descricao`, `impactoMensal`, `prioridade`
- `AnaliseGastos` com campos: `mesAtual`, `entradasMesAtual`, `saidasMesAtual`, `saldoMesAtual`, `comparativo`, `recorrentes`, `sugestoes`, `transacoesAnalisadas`, `transacoesAvaliadas`

## Decisão sobre Roteamento

Adicionar rota `transacoes/analise` (lazy load). Considerar se adicionar link no sidebar/header; verificar shell.ts. Incluir aba/link conforme padrão existente.

## Decisão sobre Página

Criar `src/app/features/analise-gastos/analise-gastos.page.ts` (standalone, OnPush, signals) com 3 abas: Comparativo, Recorrentes, Sugestões. Usar Motion One para transições entre abas (respeitando reduced motion).

## Decisão sobre Transactions (melhorias)

Melhorias na página de transações conforme especificado:
- Inline edit na descrição (editar ao clicar, salvar Enter/blur, cancelar Esc)
- Filtro por método (chips/select) - campo `metodo`? Verificar modelo Transaction. Atualmente Transaction tem `type`, `description`, `direction` etc. Precisa verificar se existe `metodo`. 
- Exibir badge de método, status, avaliação (estrelas 1-5)

**Nota:** Verificar modelo existente antes de adicionar campos. Pode ser necessário estender interface Transaction.

## Etapas de implementação

1. [x] Criar branch `feat/gastos-analise`
2. [x] Adicionar dependência `@motionone/angular`
3. [x] Escrever documentos de decisão (este + liquid motion)
4. [ ] Criar modelos de análise de gastos
5. [ ] Criar serviço de análise de gastos
6. [ ] Criar página de análise de gastos com tabs + Motion One
7. [ ] Adicionar rota e link de navegação
8. [ ] Melhorar página de transações
9. [ ] Testar, lint, commits por mudança lógica
10. [ ] Atualizar docs de decisão com dificuldades/alternativas encontradas

## Dificuldades/Alternativas (registrar durante implementação)
(serão preenchidas conforme avançamos)
