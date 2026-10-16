/* ---------------------------------------------------------------------------
   Análise de gastos — alinhado 1:1 com a API Java
   (`GET /api/transacoes/analise`). Os nomes dos campos são exatamente os
   devolvidos pelo backend; nada de tradução no cliente.
--------------------------------------------------------------------------- */

export type PrioridadeSugestao = 'alta' | 'media' | 'baixa';

/** Um mês no comparativo entradas × saídas. */
export interface ComparativoMensal {
  /** `YYYY-MM` */
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  /** Variação das saídas vs. mês anterior, em %. */
  variacaoSaidasPercent: number;
  /** Variação das entradas vs. mês anterior, em %. */
  variacaoEntradasPercent: number;
}

/** Gasto que se repete mês a mês (assinatura, feira, aluguel…). */
export interface GastoRecorrente {
  estabelecimento: string;
  categoria: string;
  tipo: string;
  valorMedio: number;
  quantidadeMeses: number;
  /** Meses (`YYYY-MM`) em que apareceu. */
  meses: string[];
  totalGasto: number;
  economiaAnualPotencial: number;
}

/** Dica de economia gerada pela análise. */
export interface SugestaoEconomia {
  tipo: string;
  titulo: string;
  descricao: string;
  impactoMensal: number;
  prioridade: PrioridadeSugestao;
}

/** Envelope completo da análise. */
export interface AnaliseGastos {
  /** `YYYY-MM` do mês corrente. */
  mesAtual: string;
  entradasMesAtual: number;
  saidasMesAtual: number;
  saldoMesAtual: number;
  comparativo: ComparativoMensal[];
  recorrentes: GastoRecorrente[];
  sugestoes: SugestaoEconomia[];
  transacoesAnalisadas: number;
  transacoesAvaliadas: number;
}

/** Estrutura vazia — fallback quando a API falha ou não há dados. */
export function analiseVazia(mesAtual?: string): AnaliseGastos {
  return {
    mesAtual: mesAtual ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    entradasMesAtual: 0,
    saidasMesAtual: 0,
    saldoMesAtual: 0,
    comparativo: [],
    recorrentes: [],
    sugestoes: [],
    transacoesAnalisadas: 0,
    transacoesAvaliadas: 0,
  };
}
