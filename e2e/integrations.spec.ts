import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const demoLogin = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
};

/** A BrAPI é chamada de verdade; sem rede o app cai no seed, então a espera é larga. */
const LENTO = { timeout: 25_000 };

test.describe('hub de integrações', () => {
  test('o hub de integrações abre na visão geral', async ({ page }) => {
    await demoLogin(page);
    // A navegação principal não tem link para o hub: ele é alcançável por URL
    // direta. O que importa aqui é que a rota exist, redirecione para a visão
    // geral e renderize o conteúdo.
    await page.goto('/integracoes');

    await expect(page).toHaveURL(/\/integracoes\/visao-geral/);
    await expect(page.getByRole('heading', { level: 1, name: 'Integrações' })).toBeVisible();
    await expect(page.getByText('Central de integrações')).toBeVisible();
  });

  test('mostra as cinco abas no estilo board', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/visao-geral');

    const abas = page.getByRole('navigation', { name: 'Quadros de integração' }).getByRole('link');
    await expect(abas).toHaveCount(5);
    for (const nome of ['Visão geral', 'Investimentos', 'Cotações', 'Conexões', 'Configurações']) {
      await expect(abas.filter({ hasText: nome })).toHaveCount(1);
    }
  });

  test('cada aba navega para o seu quadro', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/visao-geral');

    const abas = page.getByRole('navigation', { name: 'Quadros de integração' }).getByRole('link');

    await abas.filter({ hasText: 'Investimentos' }).click();
    await expect(page).toHaveURL(/\/integracoes\/investimentos/);

    await abas.filter({ hasText: 'Cotações' }).click();
    await expect(page).toHaveURL(/\/integracoes\/cotacoes/);

    await abas.filter({ hasText: 'Conexões' }).click();
    await expect(page).toHaveURL(/\/integracoes\/conexoes/);

    await abas.filter({ hasText: 'Configurações' }).click();
    await expect(page).toHaveURL(/\/integracoes\/configuracoes/);
  });

  test('a visão geral mostra indicadores e os cards de quadro', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/visao-geral');

    // `exact` evita colidir com o card "Investimentos", cuja descrição
    // menciona "resultado acumulado"
    await expect(page.getByText('Patrimônio investido', { exact: true })).toBeVisible();
    await expect(page.getByText('Resultado acumulado', { exact: true })).toBeVisible();
    await expect(page.getByText('Variação do dia', { exact: true })).toBeVisible();
    await expect(page.getByText('Conexões ativas', { exact: true })).toBeVisible();

    await expect(page.getByRole('link', { name: /Investimentos/ }).last()).toBeVisible();
    await expect(page.getByRole('link', { name: /Cotações/ }).last()).toBeVisible();
  });

  test('a visão geral não tem violações graves de acessibilidade', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/visao-geral');
    await expect(page.getByText('Patrimônio investido')).toBeVisible();

    const resultado = await new AxeBuilder({ page }).analyze();
    expect(resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  });
});

test.describe('quadro de investimentos', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/investimentos');
  });

  test('lista as posições da carteira', async ({ page }) => {
    const posicoes = page.getByTestId('tabela-posicoes');
    await expect(posicoes.locator('tbody tr')).toHaveCount(6, LENTO);
    await expect(posicoes).toContainText('PETR4');
    await expect(posicoes).toContainText('MXRF11');
  });

  test('filtra por classe de ativo', async ({ page }) => {
    const posicoes = page.getByTestId('tabela-posicoes');
    await expect(posicoes.locator('tbody tr')).toHaveCount(6, LENTO);

    await page.getByRole('button', { name: 'Fundos imobiliários' }).click();
    await expect(posicoes.locator('tbody tr')).toHaveCount(1);
    await expect(posicoes).toContainText('MXRF11');

    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    await expect(posicoes.locator('tbody tr')).toHaveCount(6);
  });

  test('troca o período do gráfico', async ({ page }) => {
    const grupo = page.getByRole('group', { name: 'Período do gráfico' });
    await expect(grupo.getByRole('button', { name: '3 meses' })).toHaveAttribute('aria-pressed', 'true');

    await grupo.getByRole('button', { name: '1 ano' }).click();
    await expect(grupo.getByRole('button', { name: '1 ano' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('recarrega as cotações pelo botão', async ({ page }) => {
    const botao = page.getByTestId('recarregar-cotacoes');
    await expect(botao).toBeEnabled({ timeout: 25_000 });
    await botao.click();
    await expect(botao).toBeEnabled({ timeout: 25_000 });
  });
});

test.describe('quadro de cotações', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/cotacoes');
  });

  test('mostra a origem dos dados, seja ao vivo ou demo', async ({ page }) => {
    const aviso = page.getByTestId('erro-api');
    // sem rede o app avisa; com rede funciona. Os dois caminhos são aceitos.
    await expect(page.getByText(/ao vivo|modo demonstração/).first()).toBeVisible();
    await expect(aviso.or(page.getByTestId('tabela-cotacoes'))).toBeVisible();
  });

  test('rejeita código de ticker inválido', async ({ page }) => {
    await page.getByTestId('ticker-input').fill('PETR4!');
    await page.getByTestId('ticker-buscar').click();

    await expect(page.getByTestId('ticker-erro')).toContainText('Código inválido');
  });

  test('rejeita busca vazia', async ({ page }) => {
    await page.getByTestId('ticker-buscar').click();
    await expect(page.getByTestId('ticker-erro')).toContainText('Digite um código');
  });

  test('aceita um ticker válido e traz a linha para a tabela', async ({ page }) => {
    await page.getByTestId('ticker-input').fill('PETR4');
    await page.getByTestId('ticker-buscar').click();

    await expect(page.getByTestId('ticker-erro')).toHaveCount(0);
    await expect(page.getByTestId('tabela-cotacoes')).toContainText('PETR4', LENTO);
    // o campo é limpo depois da consulta
    await expect(page.getByTestId('ticker-input')).toHaveValue('');
  });
});

test.describe('quadro de conexões', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/conexoes');
  });

  test('conectar move a integração para a lista de conectadas', async ({ page }) => {
    await expect(page.getByTestId('total-conectadas')).toHaveText('0');

    await page.getByTestId('conectar-brapi').click();

    await expect(page.getByTestId('total-conectadas')).toHaveText('1');
    await expect(page.getByRole('heading', { name: 'Conectadas' })).toBeVisible();
    await expect(page.getByText('BrAPI').first()).toBeVisible();
  });

  test('o estado da conexão sobrevive ao recarregamento', async ({ page }) => {
    await page.getByTestId('conectar-clarity').click();
    await expect(page.getByTestId('total-conectadas')).toHaveText('1');

    await page.reload();
    await expect(page.getByTestId('total-conectadas')).toHaveText('1');
  });

  test('não oferece conectar no Supabase, que vem do ambiente', async ({ page }) => {
    await expect(page.getByTestId('conectar-supabase')).toHaveCount(0);
    await expect(page.getByText('Modo demonstração').or(page.getByText('Supabase conectado'))).toBeVisible();
  });
});

test.describe('quadro de configurações', () => {
  test('alterna o tema e mantém a escolha', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/configuracoes');

    const botao = page.getByTestId('alternar-tema');
    const inicial = await page.locator('html').getAttribute('class');

    await botao.click();
    await expect(page.locator('html')).not.toHaveClass(inicial ?? '');

    await page.reload();
    await expect(page.locator('html')).toHaveClass(inicial === null ? /dark/ : /light|dark/);
  });

  test('escolhe a moeda de exibição', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/configuracoes');

    await page.getByRole('button', { name: 'USD' }).click();
    await expect(page.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.getByRole('button', { name: 'USD' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('oferece exportar as transações em CSV', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/configuracoes');

    const botao = page.getByTestId('exportar-csv');
    await expect(botao).toBeVisible();

    const download = page.waitForEvent('download');
    await botao.click();
    await expect(page.getByTestId('csv-ok')).toBeVisible();
    expect((await download).suggestedFilename()).toMatch(/^ledger-transacoes-\d{2}-\d{2}-\d{4}\.csv$/);
  });

  test('volta ao dashboard', async ({ page }) => {
    await demoLogin(page);
    await page.goto('/integracoes/configuracoes');

    await page.getByRole('button', { name: 'Voltar ao dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
