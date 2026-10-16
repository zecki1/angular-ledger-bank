import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** Telas do produto. Públicas mostram o login; protegidas entram via login demo. */
const PAGINAS = [
  { path: '/login', nome: 'login', publica: true },
  { path: '/cadastro', nome: 'cadastro', publica: true },
  { path: '/dashboard', nome: 'dashboard', publica: false },
  { path: '/transacoes', nome: 'transacoes', publica: false },
  { path: '/conta/acc-corrente', nome: 'conta-extrato', publica: false },
  { path: '/integracoes/visao-geral', nome: 'integracoes-visao-geral', publica: false },
  { path: '/integracoes/cotacoes', nome: 'integracoes-cotacoes', publica: false },
];

const VIEWPORTS = [
  { nome: 'desktop', width: 1440, height: 900 },
  { nome: 'mobile', width: 390, height: 844 },
];

const SAIDA = join('docs', 'screenshots');

/** Autentica pela mesma rota do login demo usada nos specs de smoke. */
async function demoLogin(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Espera o carregamento e as animações de entrada assentarem antes do print. */
async function aguardarEstabilizar(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  const preloader = page.locator('[data-preloader]');
  if ((await preloader.count()) > 0) {
    await preloader.waitFor({ state: 'detached', timeout: 8000 }).catch(() => undefined);
  }
  await page.waitForTimeout(1200);
}

test.describe('screenshots (baselines do README)', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(viewport.nome, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const pagina of PAGINAS) {
        test(`${pagina.nome} ${viewport.nome}`, async ({ page }) => {
          mkdirSync(SAIDA, { recursive: true });

          if (!pagina.publica) {
            await demoLogin(page);
          }
          await page.goto(pagina.path);
          await aguardarEstabilizar(page);

          await page.screenshot({
            path: join(SAIDA, `${pagina.nome}-${viewport.nome}.jpg`),
            fullPage: true,
            type: 'jpeg',
            quality: 80,
          });
        });
      }
    });
  }
});
