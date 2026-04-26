import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/',
  '/produtos',
  '/sobre',
  '/trocas',
  '/privacidade',
  '/termos',
  '/entrar',
  '/comunidade',
  '/rastreio',
];

for (const path of PAGES) {
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${path}`);
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    // Documentar violations sem falhar build em fase exploratoria
    if (accessibilityScanResults.violations.length > 0) {
      console.log(`${path}: ${accessibilityScanResults.violations.length} violations`);
      for (const v of accessibilityScanResults.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.description}`);
      }
    }

    // Falhar apenas em violations critical (nao bloquear deploy v1)
    const criticals = accessibilityScanResults.violations.filter(v => v.impact === 'critical');
    expect(criticals).toHaveLength(0);
  });
}
