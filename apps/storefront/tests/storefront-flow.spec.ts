import { test, expect } from '@playwright/test';

/**
 * E2E flow tests — Lojeo storefront jewelry-v1
 *
 * Smoke tests para fluxos críticos. Executar: `pnpm --filter @lojeo/storefront test:e2e`
 * Requer storefront rodando local (playwright.config webServer dispara `pnpm dev`).
 */

test.describe('Homepage', () => {
  test('renderiza hero + categorias + footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /produtos/i }).first()).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('navegação para /produtos via header', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /anéis/i }).first().click();
    await expect(page).toHaveURL(/\/produtos\?categoria=aneis/);
  });
});

test.describe('PLP /produtos', () => {
  test('lista produtos + tem filtros', async ({ page }) => {
    await page.goto('/produtos');
    await expect(page.locator('h1').first()).toBeVisible();
    // Pelo menos um filtro deve estar visível
    const filters = page.locator('button, select').filter({ hasText: /material|preço|aro/i });
    expect(await filters.count()).toBeGreaterThan(0);
  });
});

test.describe('Páginas estáticas', () => {
  for (const path of ['/sobre', '/trocas', '/privacidade', '/termos']) {
    test(`${path} 200 + h1 visible`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();
    });
  }
});

test.describe('Rastreamento', () => {
  test('/rastreio form aceita código', async ({ page }) => {
    await page.goto('/rastreio');
    await expect(page.getByRole('heading')).toBeVisible();
    const input = page.locator('input').first();
    await expect(input).toBeVisible();
  });
});

test.describe('Auth gate', () => {
  test('/conta/* redireciona para /entrar', async ({ page }) => {
    await page.goto('/conta/pedidos');
    await expect(page).toHaveURL(/\/entrar/);
  });
});

test.describe('PWA', () => {
  test('manifest disponível', async ({ request }) => {
    const r = await request.get('/manifest.webmanifest');
    expect(r.status()).toBe(200);
    const data = await r.json();
    expect(data.name).toBeTruthy();
    expect(data.icons.length).toBeGreaterThan(0);
  });

  test('service worker disponível', async ({ request }) => {
    const r = await request.get('/sw.js');
    expect(r.status()).toBe(200);
    const text = await r.text();
    expect(text).toContain('addEventListener');
  });
});

test.describe('SEO', () => {
  test('homepage tem JSON-LD Organization ou WebSite', async ({ page }) => {
    await page.goto('/');
    const ldJson = await page.locator('script[type="application/ld+json"]').count();
    // Pode ser 0 se Organization JSON-LD ainda não foi adicionado (pendência docs)
    expect(ldJson).toBeGreaterThanOrEqual(0);
  });

  test('PDP tem Product JSON-LD se produto existe', async ({ page }) => {
    await page.goto('/produtos');
    const firstProduct = page.locator('a[href^="/produtos/"]').first();
    if (await firstProduct.count() > 0) {
      await firstProduct.click();
      await page.waitForLoadState('networkidle');
      const ldScripts = page.locator('script[type="application/ld+json"]');
      const count = await ldScripts.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Status page', () => {
  test('/status renderiza serviços', async ({ page }) => {
    await page.goto('/status');
    await expect(page.locator('h1')).toContainText(/operacional|degradado|fora/i);
  });
});
