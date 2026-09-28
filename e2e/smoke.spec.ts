import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const demoLogin = async (page: import('@playwright/test').Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
};

test.describe('autenticação', () => {
  test('rota protegida redireciona para o login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { level: 1, name: /Acesse seu Ledger/ })).toBeVisible();
  });

  test('login demo entra no dashboard com saldo e gráfico', async ({ page }) => {
    await demoLogin(page);
    // Escopado ao <main>: o total também aparece na barra lateral do shell.
    const main = page.getByRole('main');
    await expect(main.getByText('Saldo consolidado')).toBeVisible();
    await expect(page.getByLabel(/Gráfico de fluxo de caixa/)).toBeVisible();
  });

  test('logout retorna ao login', async ({ page }) => {
    await demoLogin(page);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('transações', () => {
  test('lista filtra pela busca', async ({ page }) => {
    await demoLogin(page);
    await page.getByRole('link', { name: 'Transações' }).first().click();
    await expect(page).toHaveURL(/\/transacoes/);
    await expect(page.getByRole('heading', { level: 1, name: /Transações/ })).toBeVisible();

    const rows = () => page.locator('tbody tr');
    await expect(rows().first()).toBeVisible();
    const total = await rows().count();

    await page.getByPlaceholder(/Buscar por descrição/).fill('salário');
    await expect(rows()).toHaveCount(1);
    await expect(rows().first()).toContainText(/Salário/);
    expect(total).toBeGreaterThan(1);

    await page.getByPlaceholder(/Buscar por descrição/).fill('');
    await expect(rows().first()).toBeVisible();
  });

  test('pagina a lista', async ({ page }) => {
    await demoLogin(page);
    await page.getByRole('link', { name: 'Transações' }).first().click();

    const activePage = () => page.locator('button[aria-current="page"]');
    await expect(activePage()).toHaveText('1');

    await page.getByRole('button', { name: 'Próxima página' }).click();
    await expect(activePage()).toHaveText('2');
  });

  test('navega ao extrato da conta pelo card de saldo', async ({ page }) => {
    await demoLogin(page);
    await page.getByRole('link', { name: /Conta Corrente/ }).click();
    await expect(page).toHaveURL(/\/conta\/acc-corrente/);
    await expect(page.getByRole('heading', { level: 1, name: /R\$/ })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /Extrato/ })).toBeVisible();
  });
});

test.describe('tema', () => {
  test('alterna entre escuro e claro e persiste a escolha', async ({ page }) => {
    await demoLogin(page);

    const html = page.locator('html');
    const isDarkNow = async (): Promise<boolean> =>
      ((await html.getAttribute('class')) ?? '').includes('dark');

    // O primeiro tema segue a preferência do sistema (o Playwright usa light),
    // então o teste parte do estado real em vez de assumir dark.
    const startDark = await isDarkNow();
    await page
      .getByRole('button', { name: startDark ? 'Ativar tema claro' : 'Ativar tema escuro' })
      .first()
      .click();

    // `expect.poll` porque o effect do signal escreve no DOM no ciclo seguinte.
    await expect.poll(isDarkNow).toBe(!startDark);

    // A escolha sobrevive a um recarregamento (localStorage).
    await page.reload();
    await expect.poll(isDarkNow).toBe(!startDark);
  });
});

test.describe('acessibilidade', () => {
  test('sem violações graves ou críticas', async ({ page }) => {
    await demoLogin(page);
    const paths = ['/dashboard', '/transacoes', '/conta/acc-corrente'];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).analyze();
      const majors = (results.violations as Array<{ impact?: string }>).filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );
      expect(majors, `violações em ${path}`).toEqual([]);
    }
  });
});