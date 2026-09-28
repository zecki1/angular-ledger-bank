export type AccountType = 'conta_corrente' | 'poupanca' | 'cartao_credito';
export type TransactionType = 'pix' | 'ted' | 'debito' | 'credito' | 'investimento' | 'pagamento';
export type Direction = 'in' | 'out';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  description: string;
  amount: number;
  direction: Direction;
  category: string;
  settledAt: string;
}

export interface SessionUser {
  email: string;
  name: string;
  createdAt: number;
}

export interface CashFlowPoint {
  date: string;
  value: number;
}
/* ---------------------------------------------------------------------------
   Investimentos, mercado e integrações
--------------------------------------------------------------------------- */

export type AssetClass = 'acao' | 'fii' | 'renda_fixa' | 'cripto' | 'fundo' | 'exterior';

export interface Holding {
  ticker: string;
  nome: string;
  classe: AssetClass;
  quantidade: number;
  precoMedio: number;
}

export interface PricePoint {
  date: string;
  close: number;
}

/** Cotação normalizada — a API traz snake_case e o app consome só isto. */
export interface Quote {
  ticker: string;
  nome: string;
  preco: number;
  variacao: number;
  variacaoPercent: number;
  moeda: string;
  abertura: number;
  minima: number;
  maxima: number;
  volume: number;
  valorMercado: number;
  minimo52: number;
  maximo52: number;
  atualizadoEm: string;
  logoUrl: string;
}

export type QuoteOrigin = 'ao_vivo' | 'cache' | 'demo';

export interface QuoteResult {
  quote: Quote;
  origin: QuoteOrigin;
}

export type MarketRange = '1d' | '5d' | '1mo' | '3mo' | '1y';

export interface IntegrationCategory {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  integrada: boolean;
  exigeLogin: boolean;
  /**
   * `true` quando o estado vem do ambiente e não de um botão: o Supabase
   * está ligado ou não conforme as variáveis, e oferecer "Conectar" seria
   * um botão que não faz nada.
   */
  doAmbiente: boolean;
  detalhe: string;
}

export interface AllocationSlice {
  classe: AssetClass;
  valor: number;
  peso: number;
}

export interface PortfolioPosition extends Holding {
  preco: number;
  valor: number;
  custo: number;
  resultado: number;
  resultadoPercent: number;
  variacaoDia: number;
  variacaoDiaPercent: number;
}
