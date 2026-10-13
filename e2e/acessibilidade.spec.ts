import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Páginas públicas. As protegidas entram depois do login demo. */
const PAGINAS_PUBLICAS = [{ path: '/login', nome: 'login' }];

/** Páginas protegidas (autenticadas pelo login demo). */
const PAGINAS_PROTEGIDAS = [
  { path: '/dashboard', nome: 'dashboard' },
  { path: '/transacoes', nome: 'transacoes' },
  { path: '/conta/acc-corrente', nome: 'conta-extrato' },
  { path: '/integracoes/visao-geral', nome: 'integracoes-visao-geral' },
  { path: '/integracoes/investimentos', nome: 'integracoes-investimentos' },
  { path: '/integracoes/cotacoes', nome: 'integracoes-cotacoes' },
  { path: '/integracoes/configuracoes', nome: 'integracoes-configuracoes' },
];

/** Entra com o usuário demo reaproveitando o fluxo dos specs de smoke. */
const demoLogin = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Entrar como usuário demo' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
};

test.describe('acessibilidade (axe)', () => {
  // Uma única varredura percorre 8 páginas (login + 7 autenticadas), então
  // precisa de mais tempo que o timeout padrão de 30 s.
  test.setTimeout(180_000);

  test('gera relatório e falha em violações graves/críticas', async ({ page }) => {
    const relatorio: Array<Record<string, unknown>> = [];

    const analisar = async (path: string, nome: string): Promise<void> => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      const resultados = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const graves = resultados.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      );

      relatorio.push({
        pagina: nome,
        url: path,
        violacoes: resultados.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          descricao: v.help,
          nos: v.nodes.length,
        })),
        passes: resultados.passes.length,
        graves: graves.length,
      });

      expect(
        graves,
        `violações graves/críticas em ${path}: ${graves.map((v) => v.id).join(', ')}`,
      ).toEqual([]);
    };

    for (const pagina of PAGINAS_PUBLICAS) {
      await analisar(pagina.path, pagina.nome);
    }

    await demoLogin(page);

    for (const pagina of PAGINAS_PROTEGIDAS) {
      await analisar(pagina.path, pagina.nome);
    }

    mkdirSync('docs/a11y', { recursive: true });
    writeFileSync(
      join('docs/a11y', 'relatorio-axe.json'),
      `${JSON.stringify(relatorio, null, 2)}\n`,
      'utf8',
    );
  });
});
