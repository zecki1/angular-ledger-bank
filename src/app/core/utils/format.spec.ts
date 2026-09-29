import { describe, expect, it, vi } from 'vitest';

import { Transaction } from '../models';
import {
  ASSET_CLASS_LABEL,
  downloadCSV,
  filterTransactions,
  formatBRL,
  formatChange,
  formatCompactBRL,
  formatDate,
  formatDayLong,
  formatDeltaBRL,
  formatNumber,
  formatPercent,
  formatQuotePrice,
  formatSignedBRL,
  formatVolume,
  formatWeight,
  toCSV,
} from './format';

const tx = (partial: Partial<Transaction>): Transaction => ({
  id: '1',
  accountId: 'acc-corrente',
  type: 'pix',
  description: 'Feira da Santa Cecília',
  amount: 100,
  direction: 'out',
  category: 'alimentacao',
  settledAt: '2026-09-22T12:00:00.000Z',
  ...partial,
});

describe('formatBRL', () => {
  it('formata valores em reais', () => {
    expect(formatBRL(8432.7)).toBe('R$ 8.432,70');
  });

  it('formata centavos', () => {
    expect(formatBRL(0.5)).toBe('R$ 0,50');
  });
});

describe('formatDate', () => {
  it('converte ISO para dd/mm/aaaa', () => {
    expect(formatDate('2026-09-22T12:00:00.000Z')).toBe('22/09/2026');
  });
});

describe('formatSignedBRL', () => {
  const spaces = (s: string): string => s.replace(/\u00a0/g, ' ');

  it('prefixa com + para entradas', () => {
    expect(spaces(formatSignedBRL(6200, 'in'))).toBe('+ R$ 6.200,00');
  });

  it('prefixa com - para saídas', () => {
    expect(spaces(formatSignedBRL(1850, 'out'))).toBe('- R$ 1.850,00');
  });

  it('trabalha com valor absoluto', () => {
    expect(spaces(formatSignedBRL(-47.9, 'out'))).toBe('- R$ 47,90');
  });
});

describe('formatDayLong', () => {
  const iso = (offsetDays: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    date.setHours(12, 0, 0, 0);
    return date.toISOString();
  };

  it('rotula o dia atual como Hoje', () => {
    expect(formatDayLong(iso(0))).toBe('Hoje');
  });

  it('rotula o dia anterior como Ontem', () => {
    expect(formatDayLong(iso(-1))).toBe('Ontem');
  });

  it('formata dias mais antigos por extenso', () => {
    expect(formatDayLong(iso(-5))).not.toBe('Hoje');
    expect(formatDayLong(iso(-5))).not.toBe('Ontem');
  });
});

describe('filterTransactions', () => {
  const list = [
    tx({ id: 'a', description: 'Uber — aeroporto', type: 'pix', category: 'transporte' }),
    tx({ id: 'b', description: 'Aluguel', type: 'pagamento', category: 'moradia' }),
    tx({ id: 'c', description: 'Salário', type: 'credito', category: 'salario', direction: 'in' }),
  ];

  it('retorna tudo sem filtro', () => {
    expect(filterTransactions(list, {})).toHaveLength(3);
  });

  it('filtra por busca em descrição', () => {
    expect(filterTransactions(list, { search: 'aluguel' }).map((t) => t.id)).toEqual(['b']);
  });

  it('filtra por tipo', () => {
    expect(filterTransactions(list, { type: 'credito' }).map((t) => t.id)).toEqual(['c']);
  });

  it('filtra por categoria', () => {
    expect(filterTransactions(list, { category: 'transporte' }).map((t) => t.id)).toEqual(['a']);
  });

  it('combina busca + categoria', () => {
    expect(filterTransactions(list, { search: 'uber', category: 'moradia' })).toHaveLength(0);
  });
});

describe('toCSV', () => {
  it('gera CSV pt-BR com cabeçalho e vírgulas escapadas', () => {
    const csv = toCSV([tx({ description: 'Venda, "brechó"' })]);
    expect(csv.split('\n')[0]).toBe('descricao;tipo;categoria;direcao;valor;data');
    expect(csv).toContain('"Venda, ""brechó"""');
    expect(csv).toContain('100,00');
  });
});

describe('downloadCSV', () => {
  it('aciona o download via clique no anchor', () => {
    document.body.innerHTML = '';
    const click = vi.fn();
    const create = document.createElement.bind(document);
    const createSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = create(tag) as HTMLAnchorElement;
      el.click = click;
      return el;
    });
    const urlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ledger');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    downloadCSV('ledger.csv', 'descricao;valor\nCafé;10,00');

    expect(click).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith('a');
    expect(urlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(revokeSpy).toHaveBeenCalledWith('blob:ledger');

    createSpy.mockRestore();
    urlSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

/** O `Intl` pt-BR separa o símbolo da moeda com espaço não separável (U+00A0). */
const nbsp = (s: string) => s.replace(/\u00a0/g, ' ');

describe('formatadores de mercado', () => {
  it('formatNumber respeita as casas decimais', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50');
    expect(formatNumber(1234.5, 0)).toBe('1.235');
    expect(formatNumber(1234.5, 3)).toBe('1.234,500');
  });

  it('formatPercent sempre mostra o sinal', () => {
    expect(formatPercent(4.5678)).toBe('+4,57%');
    expect(formatPercent(-4.5678)).toBe('-4,57%');
    expect(formatPercent(0)).toBe('0,00%');
  });

  it('formatWeight não mostra sinal (peso de alocação)', () => {
    expect(formatWeight(12.44)).toBe('12,4%');
    expect(formatWeight(12.44, 2)).toBe('12,44%');
  });

  it('formatChange mostra o sinal e a casa pedida', () => {
    expect(formatChange(-3.15)).toBe('-3,15%');
    expect(formatChange(2.5)).toBe('+2,50%');
    expect(formatChange(0)).toBe('0,00%');
    expect(formatChange(2.5, 0)).toBe('+3%');
  });

  it('formatDeltaBRL mostra a variação em dinheiro com o sinal na frente', () => {
    expect(nbsp(formatDeltaBRL(-1.25))).toBe('-R$ 1,25');
    expect(nbsp(formatDeltaBRL(1.25))).toBe('+R$ 1,25');
    expect(nbsp(formatDeltaBRL(0))).toBe('R$ 0,00');
  });

  it('formatQuotePrice respeita a moeda da resposta', () => {
    expect(nbsp(formatQuotePrice(38.5))).toBe('R$ 38,50');
    expect(nbsp(formatQuotePrice(9.87, 'USD'))).toBe('US$ 9,87');
  });

  it('formatCompactBRL escolhe a escala', () => {
    expect(formatCompactBRL(241_000_000_000)).toBe('R$ 241 bi');
    expect(formatCompactBRL(1_500_000)).toBe('R$ 1,5 mi');
    expect(formatCompactBRL(12_345)).toBe('R$ 12,3 mil');
  });

  it('formatCompactBRL põe o sinal antes do símbolo, não no meio', () => {
    expect(formatCompactBRL(-2_000_000_000)).toBe('-R$ 2 bi');
    expect(formatCompactBRL(2_000_000_000)).toBe('R$ 2 bi');
  });

  it('formatCompactBRL cai no formato cheio abaixo de mil', () => {
    expect(nbsp(formatCompactBRL(0))).toBe('R$ 0,00');
    expect(nbsp(formatCompactBRL(999))).toBe('R$ 999,00');
  });

  it('formatVolume encurta números grandes e usa travessão para volume desconhecido', () => {
    expect(formatVolume(12_345_678)).toMatch(/mi$/);
    expect(formatVolume(0)).toBe('—');
    expect(formatVolume(-1)).toBe('—');
  });

  it('ASSET_CLASS_LABEL cobre as classes do seed', () => {
    for (const classe of ['acao', 'fii', 'renda_fixa', 'cripto', 'fundo', 'exterior']) {
      expect(ASSET_CLASS_LABEL[classe]).toBeTruthy();
    }
  });
});
