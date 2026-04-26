import { describe, expect, it } from 'vitest';
import * as schema from './schema/index';

describe('schema', () => {
  it('exporta tabelas-base com tenant_id', () => {
    expect(schema.tenants).toBeDefined();
    expect(schema.users).toBeDefined();
    expect(schema.products).toBeDefined();
    expect(schema.productVariants).toBeDefined();
    expect(schema.behaviorEvents).toBeDefined();
    expect(schema.aiCache).toBeDefined();
    expect(schema.aiCalls).toBeDefined();
    expect(schema.orders).toBeDefined();
    expect(schema.orderItems).toBeDefined();
    expect(schema.orderEvents).toBeDefined();
    expect(schema.customerAddresses).toBeDefined();
    expect(schema.wishlistItems).toBeDefined();
    expect(schema.restockNotifications).toBeDefined();
    expect(schema.giftCards).toBeDefined();
    expect(schema.productReviews).toBeDefined();
  });

  it('garante coluna tenant_id em entidades multi-tenant', () => {
    const multiTenant = [
      schema.products,
      schema.productVariants,
      schema.productImages,
      schema.collections,
      schema.behaviorEvents,
      schema.sessionsBehavior,
      schema.orders,
      schema.orderItems,
      schema.orderEvents,
      schema.customerAddresses,
    ];
    for (const t of multiTenant) {
      expect((t as unknown as Record<string, unknown>).tenantId, `${(t as unknown as { _: { name: string } })._?.name}`).toBeDefined();
    }
  });
});

import { selectVariant } from './schema/experiments';

describe('selectVariant (A/B testing helper)', () => {
  const variants = [
    { key: 'a', name: 'Controle', weight: 50 },
    { key: 'b', name: 'Variante', weight: 50 },
  ];

  it('retorna null se variants vazio', () => {
    expect(selectVariant('exp', 'anon', [])).toBeNull();
  });

  it('é determinístico para mesmo anonymousId', () => {
    const v1 = selectVariant('hero-test', 'anon-123', variants);
    const v2 = selectVariant('hero-test', 'anon-123', variants);
    expect(v1?.key).toBe(v2?.key);
  });

  it('distribui ~50/50 ao longo de muitas amostras', () => {
    let aCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const v = selectVariant('exp', `anon-${i}`, variants);
      if (v?.key === 'a') aCount++;
    }
    const ratio = aCount / N;
    expect(ratio).toBeGreaterThan(0.42);
    expect(ratio).toBeLessThan(0.58);
  });

  it('respeita pesos desbalanceados (90/10)', () => {
    const skewed = [
      { key: 'a', name: 'A', weight: 90 },
      { key: 'b', name: 'B', weight: 10 },
    ];
    let aCount = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const v = selectVariant('exp', `anon-${i}`, skewed);
      if (v?.key === 'a') aCount++;
    }
    const ratio = aCount / N;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });

  it('experimentos diferentes redistribuem mesmos users', () => {
    // Mesma anon — diferentes experimentos tendem a cair em variantes diferentes (não correlacionadas)
    let sameVariantCount = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const anon = `anon-${i}`;
      const v1 = selectVariant('exp-1', anon, variants);
      const v2 = selectVariant('exp-2', anon, variants);
      if (v1?.key === v2?.key) sameVariantCount++;
    }
    // Deve ficar em torno de 50% — correlation seria errada
    const ratio = sameVariantCount / N;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });
});
