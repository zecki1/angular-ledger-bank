import { Account, Transaction } from '../models';

/**
 * Seed fictício (espelha o planejamento: conta corrente + poupança + cartão
 * para o user@demo.dev, com ~3 meses de transações PIX, débito, crédito e
 * investimento). Datas são ancoradas em "hoje" para o demo nunca envelhecer.
 */
export interface DemoSeed {
  accounts: Account[];
  transactions: Transaction[];
}

const daysAgo = (days: number, hour = 12): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
};

export const demoSeed = (): DemoSeed => {
  const accounts: Account[] = [
    { id: 'acc-corrente', name: 'Conta Corrente', type: 'conta_corrente', balance: 8432.7, currency: 'BRL', color: '#8b5cf6' },
    { id: 'acc-poupanca', name: 'Poupança', type: 'poupanca', balance: 23910.15, currency: 'BRL', color: '#34d399' },
    { id: 'acc-cartao', name: 'Cartão de Crédito', type: 'cartao_credito', balance: 1240.9, currency: 'BRL', color: '#f87171' },
  ];

  const transactions: Transaction[] = [
    { id: 't01', accountId: 'acc-corrente', type: 'credito', description: 'Salário — Bolts Técnica', amount: 6200, direction: 'in', category: 'salario', settledAt: daysAgo(2, 9) },
    { id: 't02', accountId: 'acc-corrente', type: 'pagamento', description: 'Aluguel — Edifício Aurora', amount: 1850, direction: 'out', category: 'moradia', settledAt: daysAgo(2, 8) },
    { id: 't03', accountId: 'acc-corrente', type: 'pix', description: 'Feira da Santa Cecília', amount: 182.4, direction: 'out', category: 'alimentacao', settledAt: daysAgo(1, 11) },
    { id: 't04', accountId: 'acc-corrente', type: 'pix', description: 'PIX — Marina Lopes', amount: 150, direction: 'out', category: 'transferencias', settledAt: daysAgo(1, 15) },
    { id: 't05', accountId: 'acc-corrente', type: 'debito', description: 'Ifood — almoço de hoje', amount: 47.9, direction: 'out', category: 'alimentacao', settledAt: daysAgo(0, 13) },
    { id: 't06', accountId: 'acc-corrente', type: 'pagamento', description: 'Conta de luz — Enel', amount: 213.55, direction: 'out', category: 'moradia', settledAt: daysAgo(3) },
    { id: 't07', accountId: 'acc-corrente', type: 'pagamento', description: 'Internet fibra — Vivo', amount: 119.9, direction: 'out', category: 'servicos', settledAt: daysAgo(3) },
    { id: 't08', accountId: 'acc-corrente', type: 'ted', description: 'Reserva mensal — família', amount: 500, direction: 'out', category: 'transferencias', settledAt: daysAgo(4) },
    { id: 't09', accountId: 'acc-corrente', type: 'debito', description: 'Padaria Central', amount: 32.5, direction: 'out', category: 'alimentacao', settledAt: daysAgo(5, 8) },
    { id: 't10', accountId: 'acc-corrente', type: 'pix', description: 'Uber — aeroporto', amount: 86.2, direction: 'out', category: 'transporte', settledAt: daysAgo(6, 10) },
    { id: 't11', accountId: 'acc-corrente', type: 'pagamento', description: 'Play Store — assinaturas', amount: 29.9, direction: 'out', category: 'assinaturas', settledAt: daysAgo(7) },
    { id: 't12', accountId: 'acc-corrente', type: 'credito', description: 'Resgate — Tesouro Direto', amount: 240, direction: 'in', category: 'investimentos', settledAt: daysAgo(8) },
    { id: 't13', accountId: 'acc-corrente', type: 'pix', description: 'Venda de brechó', amount: 95, direction: 'in', category: 'compras', settledAt: daysAgo(9, 16) },
    { id: 't14', accountId: 'acc-corrente', type: 'debito', description: 'Drogaria São Paulo', amount: 78.9, direction: 'out', category: 'saude', settledAt: daysAgo(10, 9) },
    { id: 't15', accountId: 'acc-corrente', type: 'pagamento', description: 'Academia — Equilibra', amount: 89.9, direction: 'out', category: 'saude', settledAt: daysAgo(11) },
    { id: 't16', accountId: 'acc-corrente', type: 'ted', description: 'Comissão — projeto freelance', amount: 1750, direction: 'in', category: 'salario', settledAt: daysAgo(12, 14) },
    { id: 't17', accountId: 'acc-corrente', type: 'debito', description: 'Posto Shell — abastecimento', amount: 220, direction: 'out', category: 'transporte', settledAt: daysAgo(13, 17) },
    { id: 't18', accountId: 'acc-corrente', type: 'pix', description: 'Ingressos — cinema', amount: 64, direction: 'out', category: 'lazer', settledAt: daysAgo(14, 20) },
    { id: 't19', accountId: 'acc-corrente', type: 'pagamento', description: 'Seguro do carro', amount: 380.4, direction: 'out', category: 'moradia', settledAt: daysAgo(16) },
    { id: 't20', accountId: 'acc-corrente', type: 'credito', description: 'Cashback — cartão', amount: 12.3, direction: 'in', category: 'compras', settledAt: daysAgo(18) },
    { id: 't21', accountId: 'acc-corrente', type: 'pix', description: 'Churrasco com a galera', amount: 135, direction: 'out', category: 'lazer', settledAt: daysAgo(20, 19) },
    { id: 't22', accountId: 'acc-corrente', type: 'investimento', description: 'Rendimento — CDB 110%', amount: 45.6, direction: 'in', category: 'investimentos', settledAt: daysAgo(22) },
    { id: 't23', accountId: 'acc-corrente', type: 'pagamento', description: 'Faculdade — EAD', amount: 640.2, direction: 'out', category: 'educacao', settledAt: daysAgo(25) },
    { id: 't24', accountId: 'acc-corrente', type: 'debito', description: 'Mercado Extra', amount: 312.75, direction: 'out', category: 'alimentacao', settledAt: daysAgo(27, 12) },
    { id: 't25', accountId: 'acc-corrente', type: 'pix', description: 'Presente — aniversário da Ana', amount: 200, direction: 'out', category: 'lazer', settledAt: daysAgo(29) },

    { id: 't26', accountId: 'acc-poupanca', type: 'investimento', description: 'Rendimento — CDI', amount: 82.1, direction: 'in', category: 'investimentos', settledAt: daysAgo(1) },
    { id: 't27', accountId: 'acc-poupanca', type: 'investimento', description: 'Rendimento — CDI', amount: 79.4, direction: 'in', category: 'investimentos', settledAt: daysAgo(30) },
    { id: 't28', accountId: 'acc-poupanca', type: 'credito', description: 'Depósito programado', amount: 1000, direction: 'in', category: 'transferencias', settledAt: daysAgo(5) },
    { id: 't29', accountId: 'acc-poupanca', type: 'credito', description: 'Depósito programado', amount: 1000, direction: 'in', category: 'transferencias', settledAt: daysAgo(35) },
    { id: 't30', accountId: 'acc-poupanca', type: 'investimento', description: 'Aplicação — Tesouro Selic', amount: 500, direction: 'out', category: 'investimentos', settledAt: daysAgo(40) },
    { id: 't31', accountId: 'acc-poupanca', type: 'credito', description: 'Depósito programado', amount: 1000, direction: 'in', category: 'transferencias', settledAt: daysAgo(64) },
    { id: 't32', accountId: 'acc-poupanca', type: 'investimento', description: 'Rendimento — CDI', amount: 76.9, direction: 'in', category: 'investimentos', settledAt: daysAgo(61) },

    { id: 't33', accountId: 'acc-cartao', type: 'pagamento', description: 'Fatura anterior', amount: 1180, direction: 'out', category: 'moradia', settledAt: daysAgo(4) },
    { id: 't34', accountId: 'acc-cartao', type: 'debito', description: 'Amazon — fone sem fio', amount: 219.9, direction: 'out', category: 'compras', settledAt: daysAgo(2, 21) },
    { id: 't35', accountId: 'acc-cartao', type: 'debito', description: 'Netflix', amount: 55.9, direction: 'out', category: 'assinaturas', settledAt: daysAgo(6) },
    { id: 't36', accountId: 'acc-cartao', type: 'debito', description: 'Restaurante Osaka Sushi', amount: 176.4, direction: 'out', category: 'alimentacao', settledAt: daysAgo(8, 21) },
    { id: 't37', accountId: 'acc-cartao', type: 'pix', description: 'Estacionamento Shopping', amount: 18, direction: 'out', category: 'transporte', settledAt: daysAgo(11, 19) },
    { id: 't38', accountId: 'acc-cartao', type: 'debito', description: 'Steam — jogo indie', amount: 89.99, direction: 'out', category: 'lazer', settledAt: daysAgo(14, 23) },
    { id: 't39', accountId: 'acc-cartao', type: 'debito', description: 'Livraria Cultura', amount: 98.5, direction: 'out', category: 'educacao', settledAt: daysAgo(17, 18) },
    { id: 't40', accountId: 'acc-cartao', type: 'credito', description: 'Estorno — devolução Amazon', amount: 219.9, direction: 'in', category: 'compras', settledAt: daysAgo(1, 10) },
  ];

  return { accounts, transactions };
};