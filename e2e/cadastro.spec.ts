import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** CPF válido do gerador de teste (529.982.247-25). */
const CPF_VALIDO = '529.982.247-25';

test.describe('cadastro', () => {
  test('o login aponta para o cadastro e para o Google', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar com o Google/ })).toBeVisible();

    await page.getByRole('link', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/cadastro/);
    await expect(page.getByRole('heading', { level: 1, name: 'Criar sua conta' })).toBeVisible();
  });

  test('bloqueia senha fraca e CPF inválido', async ({ page }) => {
    await page.goto('/cadastro');

    await page.getByLabel('CPF').fill('111.111.111-11');
    await expect(page.getByText('CPF inválido.')).toBeVisible();

    await page.getByLabel('Senha', { exact: true }).fill('senha');
    await expect(page.getByText('Senha muito fraca.')).toBeVisible();
  });

  test('conclui o fluxo: dados, 2FA e biometria', async ({ page }) => {
    await page.goto('/cadastro');

    await page.getByLabel('Nome completo').fill('Ana Souza');
    await page.getByLabel('Data de nascimento').fill('01/01/1990');
    await page.getByLabel('CPF').fill(CPF_VALIDO);
    await page.getByLabel('E-mail').fill('ana@exemplo.com');
    await page.getByLabel('Senha', { exact: true }).fill('Senha@123');
    await page.getByLabel('Confirmar senha').fill('Senha@123');
    await page.getByLabel(/Li e aceito/).check();

    await page.getByRole('button', { name: 'Continuar' }).click();

    // Passo 2 — 2FA
    const codigo = page.getByLabel('Código de verificação');
    await expect(codigo).toBeVisible();
    await codigo.fill('123456');
    await page.getByRole('button', { name: 'Verificar e continuar' }).click();

    // Passo 3 — biometria
    await page.getByRole('button', { name: 'Continuar sem biometria' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('main').getByText('Saldo consolidado')).toBeVisible();
  });

  test('a tela de cadastro não tem violações graves de acessibilidade', async ({ page }) => {
    await page.goto('/cadastro');
    await page.waitForLoadState('domcontentloaded');

    const resultado = await new AxeBuilder({ page }).analyze();
    expect(
      resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
  });
});
