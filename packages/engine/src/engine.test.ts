import { describe, expect, it } from 'vitest';
import {
  registerTemplate,
  loadTemplate,
  templateIds,
  formatMoneyCents,
  discountPercent,
  applyPixIncentive,
  slugify,
  generateSku,
  scoreCustomers,
  segment,
  churnScore,
  scoreChurnBatch,
  forecastStock,
  forecastStockBatch,
} from './index';

describe('template registry', () => {
  it('carrega template registrado', async () => {
    registerTemplate('test-v1', async () => ({
      id: 'test-v1',
      name: 'Teste',
      locale: 'pt-BR',
      currency: 'BRL',
      fields: {},
      typography: {
        combos: [{ id: 'classic', label: 'Clássica', heading: 'Inter', body: 'Inter' }],
        default: 'classic',
      },
      palette: { primary: '#000', accent: '#fff', surface: '#fff', text: '#000' },
    }));
    const t = await loadTemplate('test-v1');
    expect(t.id).toBe('test-v1');
    expect(templateIds()).toContain('test-v1');
  });

  it('lança erro para template não registrado', async () => {
    await expect(loadTemplate('nao-existe')).rejects.toThrow();
  });
});

describe('pricing', () => {
  it('formata moeda BRL', () => {
    expect(formatMoneyCents(12990, 'BRL')).toMatch(/R\$\s*129,90/);
  });

  it('calcula desconto %', () => {
    expect(discountPercent({ priceCents: 8000, comparePriceCents: 10000 })).toBe(20);
    expect(discountPercent({ priceCents: 100, comparePriceCents: null })).toBe(0);
  });

  it('aplica incentivo Pix', () => {
    expect(applyPixIncentive(10000, { enabled: true, percent: 5 })).toBe(9500);
    expect(applyPixIncentive(10000, { enabled: false, percent: 5 })).toBe(10000);
  });
});

describe('sku', () => {
  it('slugify normaliza', () => {
    expect(slugify('Anel de Ouro 18k')).toBe('anel-de-ouro-18k');
  });

  it('generateSku monta prefixo + número', () => {
    expect(generateSku('Anel Ouro', 42)).toBe('ANELOURO-00042');
  });
});

describe('rfm', () => {
  const now = new Date('2026-01-31T00:00:00Z');

  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  const base = {
    userId: null,
    firstOrderAt: daysAgo(365),
  };

  const customers = [
    { email: 'champion@test.com', orderCount: 12, totalCents: 150_000, lastOrderAt: daysAgo(5), ...base },
    { email: 'loyal@test.com', orderCount: 8, totalCents: 90_000, lastOrderAt: daysAgo(20), ...base },
    { email: 'risk@test.com', orderCount: 5, totalCents: 60_000, lastOrderAt: daysAgo(90), ...base },
    { email: 'lost@test.com', orderCount: 4, totalCents: 30_000, lastOrderAt: daysAgo(180), ...base },
    { email: 'new@test.com', orderCount: 1, totalCents: 8_000, lastOrderAt: daysAgo(3), ...base },
  ];

  it('scoreCustomers retorna um profile por cliente', () => {
    const result = scoreCustomers(customers, now);
    expect(result).toHaveLength(5);
    expect(result[0]?.email).toBe('champion@test.com');
  });

  it('scoreCustomers calcula daysSinceLastOrder corretamente', () => {
    const result = scoreCustomers(customers, now);
    expect(result.find(c => c.email === 'champion@test.com')?.daysSinceLastOrder).toBe(5);
    expect(result.find(c => c.email === 'lost@test.com')?.daysSinceLastOrder).toBe(180);
  });

  it('champion tem scores altos', () => {
    const result = scoreCustomers(customers, now);
    const champ = result.find(c => c.email === 'champion@test.com')!;
    expect(champ.rfm.recency).toBeGreaterThanOrEqual(4);
    expect(champ.rfm.frequency).toBeGreaterThanOrEqual(4);
    expect(champ.rfm.monetary).toBeGreaterThanOrEqual(4);
    expect(champ.segment).toBe('champions');
  });

  it('novo cliente é segmento new', () => {
    const result = scoreCustomers(customers, now);
    const novo = result.find(c => c.email === 'new@test.com')!;
    expect(novo.rfm.frequency).toBe(1);
    expect(novo.segment).toBe('new');
  });

  it('segment retorna other para scores médios', () => {
    expect(segment({ recency: 2, frequency: 2, monetary: 2 })).toBe('other');
  });

  it('scoreCustomers com lista vazia retorna []', () => {
    expect(scoreCustomers([])).toEqual([]);
  });
});

describe('churn scoring', () => {
  const base = new Date('2026-04-26');

  it('cliente recente tem score baixo', () => {
    const yesterday = new Date('2026-04-25');
    const p = churnScore({ email: 'a@test.com', orderCount: 5, lastOrderAt: yesterday }, base);
    expect(p.churnScore).toBeLessThan(20);
    expect(p.churnRisk).toBe('active');
  });

  it('cliente inativo há 200 dias é critical', () => {
    const old = new Date('2025-10-08');
    const p = churnScore({ email: 'b@test.com', orderCount: 2, lastOrderAt: old }, base);
    expect(p.churnRisk).toBe('critical');
    expect(p.daysSinceLastOrder).toBeGreaterThan(180);
  });

  it('cliente com 1 pedido tem risco base maior', () => {
    // Use date 20 days ago — below the 30d effective cycle cutoff, so recency doesn't dominate
    const recent = new Date('2026-04-06'); // 20 days before base
    const oneTime = churnScore({ email: 'c@test.com', orderCount: 1, lastOrderAt: recent }, base);
    const loyal = churnScore({ email: 'd@test.com', orderCount: 10, lastOrderAt: recent }, base);
    expect(oneTime.churnScore).toBeGreaterThan(loyal.churnScore);
  });

  it('scoreChurnBatch ordena por score desc', () => {
    const inputs = [
      { email: 'low@test.com', orderCount: 8, lastOrderAt: new Date('2026-04-24') },
      { email: 'high@test.com', orderCount: 1, lastOrderAt: new Date('2025-10-01') },
    ];
    const result = scoreChurnBatch(inputs, base);
    expect(result[0]?.email).toBe('high@test.com');
    expect(result[1]?.email).toBe('low@test.com');
  });

  it('cliente sem pedido tem score maximo', () => {
    const p = churnScore({ email: 'e@test.com', orderCount: 0, lastOrderAt: null }, base);
    expect(p.churnScore).toBe(100);
  });
});

describe('inventory forecast', () => {
  it('produto com vendas rapidas tem daysUntilStockout baixo', () => {
    const f = forecastStock({ productId: 'p1', productName: 'Anel', currentStock: 10, unitsSoldLast30d: 30, unitsSoldLast90d: 90 });
    expect(f.daysUntilStockout).toBe(10);
    expect(f.alert).toBe('warning');
  });

  it('produto sem vendas é no_data', () => {
    const f = forecastStock({ productId: 'p2', productName: 'Colar', currentStock: 50, unitsSoldLast30d: 0, unitsSoldLast90d: 0 });
    expect(f.alert).toBe('no_data');
    expect(f.daysUntilStockout).toBe(Infinity);
  });

  it('produto com estoque alto é stable', () => {
    const f = forecastStock({ productId: 'p3', productName: 'Brinco', currentStock: 100, unitsSoldLast30d: 10, unitsSoldLast90d: 30 });
    expect(f.alert).toBe('stable');
    expect(f.daysUntilStockout).toBeGreaterThan(30);
  });

  it('produto crítico (<= 7 dias) usa fallback 90d quando vendas 30d insuficientes', () => {
    // <5 vendas em 30d → usa 90d window
    const f = forecastStock({ productId: 'p4', productName: 'Pulseira', currentStock: 2, unitsSoldLast30d: 2, unitsSoldLast90d: 20 });
    // velocity = 20/90 ≈ 0.22/dia → stockout = 2/0.22 ≈ 9 dias
    expect(f.alert).toBe('warning');
    expect(f.daysUntilStockout).toBeLessThanOrEqual(10);
  });

  it('forecastStockBatch ordena critical primeiro', () => {
    const items = [
      { productId: 'a', productName: 'A', currentStock: 100, unitsSoldLast30d: 10, unitsSoldLast90d: 30 },
      { productId: 'b', productName: 'B', currentStock: 3, unitsSoldLast30d: 30, unitsSoldLast90d: 90 },
    ];
    const result = forecastStockBatch(items);
    expect(result[0]?.productId).toBe('b');
    expect(result[0]?.alert).toBe('critical');
  });
});

import { computeWarranty, computeWarrantyBatch, expiringWithinDays } from './warranty';

describe('warranty engine', () => {
  const now = new Date('2026-04-26T12:00:00Z');

  it('returns none for product without warrantyMonths', () => {
    const r = computeWarranty({
      orderId: 'o1', orderItemId: 'oi1', productId: 'p1',
      productName: 'Anel', warrantyMonths: 0,
      startsAt: new Date('2026-01-01'),
    }, now);
    expect(r.status).toBe('none');
    expect(r.expiresAt).toBeNull();
  });

  it('returns active when far from expiry', () => {
    const startsAt = new Date('2026-04-01');
    const r = computeWarranty({
      orderId: 'o1', orderItemId: 'oi1', productId: 'p1',
      productName: 'Anel', warrantyMonths: 12,
      startsAt,
    }, now);
    expect(r.status).toBe('active');
    expect(r.daysRemaining).toBeGreaterThan(30);
  });

  it('returns expiring_soon when <= 30 days remain', () => {
    const startsAt = new Date('2025-05-10'); // ~12mo - some weeks
    const r = computeWarranty({
      orderId: 'o1', orderItemId: 'oi1', productId: 'p1',
      productName: 'Anel', warrantyMonths: 12,
      startsAt,
    }, now);
    expect(r.status).toBe('expiring_soon');
  });

  it('returns expired when past expiry', () => {
    const r = computeWarranty({
      orderId: 'o1', orderItemId: 'oi1', productId: 'p1',
      productName: 'Anel', warrantyMonths: 12,
      startsAt: new Date('2024-01-01'),
    }, now);
    expect(r.status).toBe('expired');
    expect(r.daysRemaining).toBeLessThan(0);
  });

  it('expiringWithinDays filters non-expired in window', () => {
    const inputs = [
      { orderId: 'a', orderItemId: 'a', productId: 'a', productName: 'A', warrantyMonths: 12, startsAt: new Date('2025-05-15') }, // expira ~2026-05-10 (~14d)
      { orderId: 'b', orderItemId: 'b', productId: 'b', productName: 'B', warrantyMonths: 12, startsAt: new Date('2026-04-01') }, // active (~360d)
      { orderId: 'c', orderItemId: 'c', productId: 'c', productName: 'C', warrantyMonths: 12, startsAt: new Date('2024-01-01') }, // expired
    ];
    const results = computeWarrantyBatch(inputs, now);
    const filtered = expiringWithinDays(results, 60, now);
    expect(filtered.map(r => r.orderId).sort()).toEqual(['a']);
  });
});

import { computeFrequentPairs, topPairsForProduct } from './market-basket';

describe('market basket (FBT)', () => {
  it('retorna vazio para zero pedidos', () => {
    expect(computeFrequentPairs([])).toEqual([]);
  });

  it('detecta par compartilhado em 2+ pedidos', () => {
    const orders = [
      { orderId: 'o1', productIds: ['anel', 'colar'] },
      { orderId: 'o2', productIds: ['anel', 'colar'] },
      { orderId: 'o3', productIds: ['anel'] },
    ];
    const pairs = computeFrequentPairs(orders, 2);
    // 2 pares direcionais: anel→colar e colar→anel
    expect(pairs).toHaveLength(2);
    const anelColar = pairs.find(p => p.productId === 'anel' && p.recommendedProductId === 'colar');
    expect(anelColar?.cooccurrence).toBe(2);
    expect(anelColar?.confidence).toBeCloseTo(2 / 3); // P(colar|anel)
  });

  it('respeita minCooccurrence', () => {
    const orders = [
      { orderId: 'o1', productIds: ['a', 'b'] },
      { orderId: 'o2', productIds: ['c', 'd'] },
    ];
    expect(computeFrequentPairs(orders, 2)).toEqual([]);
    expect(computeFrequentPairs(orders, 1).length).toBeGreaterThan(0);
  });

  it('lift > 1 para par associado', () => {
    const orders = [
      { orderId: 'o1', productIds: ['anel', 'colar'] },
      { orderId: 'o2', productIds: ['anel', 'colar'] },
      { orderId: 'o3', productIds: ['anel', 'colar'] },
      { orderId: 'o4', productIds: ['outro'] },
    ];
    const pairs = computeFrequentPairs(orders);
    const anelColar = pairs.find(p => p.productId === 'anel' && p.recommendedProductId === 'colar');
    expect(anelColar?.lift).toBeGreaterThan(1);
  });

  it('topPairsForProduct ordena por score desc', () => {
    const orders: { orderId: string; productIds: string[] }[] = [];
    // anel + brinco aparece 4 vezes
    for (let i = 0; i < 4; i++) orders.push({ orderId: `o${i}`, productIds: ['anel', 'brinco'] });
    // anel + colar aparece 2 vezes
    for (let i = 4; i < 6; i++) orders.push({ orderId: `o${i}`, productIds: ['anel', 'colar'] });
    const pairs = computeFrequentPairs(orders);
    const top = topPairsForProduct(pairs, 'anel', 5);
    expect(top[0]?.recommendedProductId).toBe('brinco');
    expect(top[1]?.recommendedProductId).toBe('colar');
  });

  it('ignora duplicatas dentro de um pedido', () => {
    const orders = [
      { orderId: 'o1', productIds: ['anel', 'anel', 'colar'] },
      { orderId: 'o2', productIds: ['anel', 'colar'] },
    ];
    const pairs = computeFrequentPairs(orders, 2);
    const anelColar = pairs.find(p => p.productId === 'anel' && p.recommendedProductId === 'colar');
    expect(anelColar?.cooccurrence).toBe(2); // não 3
  });
});

import { detectImageMime, isValidImageUpload } from './file-signature';

describe('file signature validation', () => {
  it('detecta JPEG por magic bytes', () => {
    const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0, 0]);
    expect(detectImageMime(buf)).toBe('image/jpeg');
  });

  it('detecta PNG por magic bytes', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0]);
    expect(detectImageMime(buf)).toBe('image/png');
  });

  it('detecta WebP por RIFF + WEBP markers', () => {
    const buf = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, 0x00, 0x00,
    ]);
    expect(detectImageMime(buf)).toBe('image/webp');
  });

  it('rejeita HTML disfarçado de imagem', () => {
    const buf = Buffer.from('<html><script>alert(1)</script></html>');
    expect(detectImageMime(buf)).toBeNull();
    expect(isValidImageUpload(buf)).toBe(false);
  });

  it('rejeita SVG (não suportado)', () => {
    const buf = Buffer.from('<?xml version="1.0"?><svg>...</svg>');
    expect(isValidImageUpload(buf)).toBe(false);
  });

  it('rejeita buffer muito pequeno', () => {
    expect(detectImageMime(Buffer.from([0xFF]))).toBeNull();
  });
});

import { computeCustomerLtv, computeLtvBatch, type OrderForLtv } from './customer-ltv';

describe('customer LTV', () => {
  const now = new Date('2026-04-26T00:00:00Z');
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

  it('retorna null se orders vazias', () => {
    expect(computeCustomerLtv([], 'a@test.com', now)).toBeNull();
    expect(computeCustomerLtv(
      [{ email: 'b@test.com', totalCents: 1000, createdAt: now, status: 'paid' }],
      'a@test.com',
      now,
    )).toBeNull();
  });

  it('calcula totalCents + orderCount + avgOrderCents corretamente', () => {
    const orders: OrderForLtv[] = [
      { email: 'a@test.com', totalCents: 10_000, createdAt: daysAgo(60), status: 'paid' },
      { email: 'a@test.com', totalCents: 20_000, createdAt: daysAgo(30), status: 'delivered' },
      { email: 'a@test.com', totalCents: 30_000, createdAt: daysAgo(10), status: 'shipped' },
    ];
    const r = computeCustomerLtv(orders, 'a@test.com', now)!;
    expect(r.totalCents).toBe(60_000);
    expect(r.orderCount).toBe(3);
    expect(r.avgOrderCents).toBe(20_000);
    expect(r.ltvUsd).toBeCloseTo(120); // 60_000 cents = 600 BRL / 5 = 120 USD
    expect(r.daysActive).toBe(50);
    expect(r.expectedLifetimeMonths).toBeGreaterThanOrEqual(12); // recente: maxClause
  });

  it('ignora orders cancelled', () => {
    const orders: OrderForLtv[] = [
      { email: 'a@test.com', totalCents: 10_000, createdAt: daysAgo(60), status: 'paid' },
      { email: 'a@test.com', totalCents: 99_999, createdAt: daysAgo(30), status: 'cancelled' },
      { email: 'a@test.com', totalCents: 20_000, createdAt: daysAgo(10), status: 'delivered' },
    ];
    const r = computeCustomerLtv(orders, 'a@test.com', now)!;
    expect(r.totalCents).toBe(30_000);
    expect(r.orderCount).toBe(2);
  });

  it('computeLtvBatch agrupa por email', () => {
    const orders: OrderForLtv[] = [
      { email: 'a@test.com', totalCents: 10_000, createdAt: daysAgo(60), status: 'paid' },
      { email: 'a@test.com', totalCents: 20_000, createdAt: daysAgo(10), status: 'paid' },
      { email: 'b@test.com', totalCents: 50_000, createdAt: daysAgo(20), status: 'paid' },
      { email: 'c@test.com', totalCents: 99_999, createdAt: daysAgo(5), status: 'cancelled' },
    ];
    const batch = computeLtvBatch(orders, now);
    expect(batch).toHaveLength(2); // c apenas tem cancelled → ignorado
    expect(batch[0]?.email).toBe('b@test.com'); // ordem desc por totalCents
    expect(batch[1]?.email).toBe('a@test.com');
    expect(batch[1]?.totalCents).toBe(30_000);
  });
});
