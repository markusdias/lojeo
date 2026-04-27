import { describe, it, expect } from 'vitest';
import {
  detectAbandonedSessions,
  aggregateAbandonedCarts,
  shouldNotify,
  type AbandonedCartEventLike,
  type ProductSummary,
} from './abandoned-cart';

const t0 = new Date('2026-04-27T10:00:00Z');
const tPlus = (mins: number) => new Date(t0.getTime() + mins * 60 * 1000);

function evt(
  sessionId: string,
  type: 'cart_add' | 'checkout_complete',
  productId: string | null,
  at: Date,
  qty?: number,
): AbandonedCartEventLike {
  return {
    sessionId,
    anonymousId: `anon-${sessionId}`,
    userId: null,
    eventType: type,
    entityId: productId,
    metadata: qty ? { qty } : {},
    createdAt: at,
  };
}

const products: Map<string, ProductSummary> = new Map([
  ['p1', { id: 'p1', name: 'Anel Aço 4mm', priceCents: 12000, imageUrl: 'https://x/p1.jpg' }],
  ['p2', { id: 'p2', name: 'Brinco Pérola', priceCents: 25000, imageUrl: null }],
]);

describe('detectAbandonedSessions', () => {
  it('detecta sessão com cart_add sem checkout_complete', () => {
    const events = [evt('s1', 'cart_add', 'p1', t0)];
    const abandoned = detectAbandonedSessions(events);
    expect(abandoned.has('s1')).toBe(true);
    expect(abandoned.get('s1')).toEqual(t0);
  });

  it('ignora sessão com checkout_complete posterior ao cart_add', () => {
    const events = [
      evt('s1', 'cart_add', 'p1', t0),
      evt('s1', 'checkout_complete', null, tPlus(5)),
    ];
    expect(detectAbandonedSessions(events).size).toBe(0);
  });

  it('inclui sessão se checkout_complete foi anterior ao cart_add (novo carrinho)', () => {
    const events = [
      evt('s1', 'checkout_complete', null, t0),
      evt('s1', 'cart_add', 'p1', tPlus(60)),
    ];
    const abandoned = detectAbandonedSessions(events);
    expect(abandoned.has('s1')).toBe(true);
  });

  it('separa sessões distintas', () => {
    const events = [
      evt('s1', 'cart_add', 'p1', t0),
      evt('s2', 'cart_add', 'p2', t0),
      evt('s2', 'checkout_complete', null, tPlus(10)),
    ];
    const abandoned = detectAbandonedSessions(events);
    expect(abandoned.has('s1')).toBe(true);
    expect(abandoned.has('s2')).toBe(false);
  });
});

describe('aggregateAbandonedCarts', () => {
  it('soma qty para mesmo produto e consolida em items', () => {
    const events = [
      evt('s1', 'cart_add', 'p1', t0, 1),
      evt('s1', 'cart_add', 'p1', tPlus(1), 2),
      evt('s1', 'cart_add', 'p2', tPlus(2), 1),
    ];
    const carts = aggregateAbandonedCarts(events, products);
    expect(carts).toHaveLength(1);
    const cart = carts[0]!;
    expect(cart.sessionId).toBe('s1');
    expect(cart.items).toHaveLength(2);
    const p1Item = cart.items.find((i) => i.productId === 'p1');
    expect(p1Item?.qty).toBe(3);
    expect(cart.subtotalCents).toBe(3 * 12000 + 1 * 25000);
  });

  it('descarta cart_add sem produto resolvido (deletado/inválido)', () => {
    const events = [
      evt('s1', 'cart_add', 'unknown', t0),
      evt('s1', 'cart_add', 'p1', tPlus(1)),
    ];
    const carts = aggregateAbandonedCarts(events, products);
    expect(carts[0]!.items).toHaveLength(1);
    expect(carts[0]!.items[0]!.productId).toBe('p1');
  });

  it('default qty=1 quando metadata não tem qty', () => {
    const events = [evt('s1', 'cart_add', 'p1', t0)];
    const carts = aggregateAbandonedCarts(events, products);
    expect(carts[0]!.items[0]!.qty).toBe(1);
  });

  it('retorna vazio quando todas sessões tem checkout_complete', () => {
    const events = [
      evt('s1', 'cart_add', 'p1', t0),
      evt('s1', 'checkout_complete', null, tPlus(5)),
    ];
    expect(aggregateAbandonedCarts(events, products)).toEqual([]);
  });
});

describe('shouldNotify', () => {
  const now = t0;

  it('retorna false sem contactEmail', () => {
    expect(shouldNotify(null, null, now)).toBe(false);
    expect(shouldNotify(undefined, null, now)).toBe(false);
    expect(shouldNotify('', null, now)).toBe(false);
  });

  it('retorna true quando lastNotifiedAt nulo', () => {
    expect(shouldNotify('a@b.com', null, now)).toBe(true);
  });

  it('retorna false quando notificado < 24h atrás', () => {
    const recent = new Date(now.getTime() - 60 * 60 * 1000);
    expect(shouldNotify('a@b.com', recent, now)).toBe(false);
  });

  it('retorna true quando notificado > 24h atrás', () => {
    const old = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    expect(shouldNotify('a@b.com', old, now)).toBe(true);
  });

  it('respeita dedupHours customizado', () => {
    const eightHrAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    expect(shouldNotify('a@b.com', eightHrAgo, now, 12)).toBe(false);
    expect(shouldNotify('a@b.com', eightHrAgo, now, 4)).toBe(true);
  });
});
