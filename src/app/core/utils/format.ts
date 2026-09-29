import { Direction, Transaction } from '../models';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatBRL(value: number): string {
  return brl.format(value);
}

export function formatSignedBRL(value: number, direction: Direction): string {
  const sign = direction === 'in' ? '+' : '-';
  return `${sign} ${brl.format(Math.abs(value))}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte um dia `YYYY-MM-DD` (produzido por `dayKey`) em `Date` local.
 *
 * `new Date('2026-09-28')` é interpretado como meia-noite **UTC**, que em fuso
 * negativo vira o dia anterior local — errando tanto o rótulo "Hoje" quanto o
 * eixo do gráfico. Montando com as partes locais, o dia é sempre o mesmo.
 */
export function fromDayKey(key: string): Date {
  if (!DAY_KEY.test(key)) {
    return new Date(key);
  }
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDayLong(iso: string): string {
  const date = fromDayKey(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) {
    return 'Hoje';
  }
  if (sameDay(date, yesterday)) {
    return 'Ontem';
  }
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(date);
}

export const TYPE_LABEL: Record<Transaction['type'], string> = {
  pix: 'PIX',
  ted: 'TED',
  debito: 'Débito',
  credito: 'Crédito',
  investimento: 'Investimento',
  pagamento: 'Pagamento',
};

export const CATEGORY_LABEL: Record<string, string> = {
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  moradia: 'Moradia',
  lazer: 'Lazer',
  saude: 'Saúde',
  educacao: 'Educação',
  salario: 'Salário',
  investimentos: 'Investimentos',
  compras: 'Compras',
  servicos: 'Serviços',
  assinaturas: 'Assinaturas',
  transferencias: 'Transferências',
};

export function filterTransactions(
  transactions: Transaction[],
  query: {
    search?: string;
    type?: string;
    category?: string;
  },
): Transaction[] {
  const search = (query.search ?? '').trim().toLowerCase();
  return transactions.filter((tx) => {
    if (search && !`${tx.description} ${tx.category} ${tx.type}`.toLowerCase().includes(search)) {
      return false;
    }
    if (query.type && tx.type !== query.type) {
      return false;
    }
    if (query.category && tx.category !== query.category) {
      return false;
    }
    return true;
  });
}

const csvEscape = (value: string): string => `"${value.replace(/"/g, '""')}"`;

export function toCSV(transactions: Transaction[]): string {
  const header = 'descricao;tipo;categoria;direcao;valor;data';
  const rows = transactions.map((tx) =>
    [
      csvEscape(tx.description),
      csvEscape(tx.type),
      csvEscape(tx.category),
      tx.direction,
      tx.amount.toFixed(2).replace('.', ','),
      isoToCsvDate(tx.settledAt),
    ].join(';'),
  );
  return [header, ...rows].join('\n');
}

function isoToCsvDate(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
/* ---------------------------------------------------------------------------
   Mercado: cotações, percentuais e números compactos
--------------------------------------------------------------------------- */

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number, casas = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function formatPercent(value: number, casas = 2): string {
  const sinal = value > 0 ? '+' : '';
  return `${sinal}${value.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** Percentual sem sinal — para peso de alocação, `12,4%` e não `+12,4%`. */
export function formatWeight(value: number, casas = 1): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

/** `R$ 1,23` sem o centavo quando o valor é inteiro — evita "R$ 49,00" em card. */
export function formatQuotePrice(value: number, moeda = 'BRL'): string {
  if (moeda !== 'BRL') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(value);
  }
  const casas = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(value);
}

/** `-4,56%` / `+2,52%` com sinal explícito, para variação do dia. */
export function formatChange(value: number, casas = 2): string {
  const sinal = value > 0 ? '+' : value < 0 ? '-' : '';
  const numero = Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return `${sinal}${numero}%`;
}

const UNIDADES: readonly [limite: number, sufixo: string][] = [
  [1e12, ' tri'],
  [1e9, ' bi'],
  [1e6, ' mi'],
  [1e3, ' mil'],
];

/** `+R$ 1,23` — variação absoluta em dinheiro, ao lado do percentual. */
export function formatDeltaBRL(value: number): string {
  const sinal = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sinal}${brl.format(Math.abs(value))}`;
}

/** `649,6 bi` — valor de mercado e volume viriam com 12 dígitos. */
export function formatCompactBRL(value: number): string {
  const absoluto = Math.abs(value);
  const sinal = value < 0 ? '-' : '';

  for (const [limite, sufixo] of UNIDADES) {
    if (absoluto >= limite) {
      const escala = absoluto / limite;
      return `${sinal}R$ ${escala.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${sufixo}`;
    }
  }
  return formatBRL(value);
}

export function formatVolume(value: number): string {
  if (value <= 0) return '—';
  for (const [limite, sufixo] of UNIDADES) {
    if (value >= limite) {
      const escala = value / limite;
      return `${escala.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}${sufixo}`;
    }
  }
  return decimal.format(value);
}

export const ASSET_CLASS_LABEL: Record<string, string> = {
  acao: 'Ações',
  fii: 'Fundos imobiliários',
  renda_fixa: 'Renda fixa',
  cripto: 'Cripto',
  fundo: 'Fundos',
  exterior: 'Exterior',
};
