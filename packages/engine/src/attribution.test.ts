import { describe, expect, it } from 'vitest';
import {
  computeAttribution,
  type OrderConversion,
} from './attribution';

const t = (iso: string) => new Date(iso);

describe('computeAttribution', () => {
  it('single touch: last/first/linear convergem na mesma linha', () => {
    const orders: OrderConversion[] = [
      {
        orderId: 'o1',
        revenueCents: 10000,
        touchpoints: [
          { source: 'google', medium: 'cpc', campaign: 'brand', ts: t('2026-04-01T10:00:00Z') },
        ],
      },
    ];
    const last = computeAttribution(orders, 'last_click');
    const first = computeAttribution(orders, 'first_click');
    const linear = computeAttribution(orders, 'linear');
    expect(last).toEqual(first);
    expect(last).toEqual(linear);
    expect(last).toHaveLength(1);
    expect(last[0]!.source).toBe('google');
    expect(last[0]!.orders).toBe(1);
    expect(last[0]!.revenueCents).toBe(10000);
    expect(last[0]!.aov).toBe(10000);
  });

  it('last_click vs first_click divergem com 2 touchpoints distintos', () => {
    const orders: OrderConversion[] = [
      {
        orderId: 'o2',
        revenueCents: 20000,
        touchpoints: [
          { source: 'meta', medium: 'paid_social', ts: t('2026-04-01T10:00:00Z') },
          { source: 'google', medium: 'cpc', ts: t('2026-04-02T10:00:00Z') },
        ],
      },
    ];
    const last = computeAttribution(orders, 'last_click');
    const first = computeAttribution(orders, 'first_click');
    expect(last).toHaveLength(1);
    expect(first).toHaveLength(1);
    expect(last[0]!.source).toBe('google');
    expect(last[0]!.revenueCents).toBe(20000);
    expect(first[0]!.source).toBe('meta');
    expect(first[0]!.revenueCents).toBe(20000);
  });

  it('linear divide receita e orders igualmente entre N touchpoints', () => {
    const orders: OrderConversion[] = [
      {
        orderId: 'o3',
        revenueCents: 30000,
        touchpoints: [
          { source: 'meta', medium: 'paid_social', ts: t('2026-04-01T10:00:00Z') },
          { source: 'google', medium: 'cpc', ts: t('2026-04-02T10:00:00Z') },
          { source: 'tiktok', medium: 'paid_social', ts: t('2026-04-03T10:00:00Z') },
        ],
      },
    ];
    const linear = computeAttribution(orders, 'linear');
    expect(linear).toHaveLength(3);
    const meta = linear.find((r) => r.source === 'meta')!;
    const google = linear.find((r) => r.source === 'google')!;
    const tiktok = linear.find((r) => r.source === 'tiktok')!;
    expect(meta.revenueCents).toBe(10000);
    expect(google.revenueCents).toBe(10000);
    expect(tiktok.revenueCents).toBe(10000);
    // 1/3 cada
    expect(meta.orders).toBeCloseTo(0.3333, 3);
    expect(google.orders).toBeCloseTo(0.3333, 3);
    expect(tiktok.orders).toBeCloseTo(0.3333, 3);
  });

  it('pedidos sem touchpoints são ignorados (não geram linhas)', () => {
    const orders: OrderConversion[] = [
      { orderId: 'o4', revenueCents: 50000, touchpoints: [] },
      {
        orderId: 'o5',
        revenueCents: 5000,
        touchpoints: [
          { source: 'direct', medium: 'none', ts: t('2026-04-01T10:00:00Z') },
        ],
      },
    ];
    const last = computeAttribution(orders, 'last_click');
    expect(last).toHaveLength(1);
    expect(last[0]!.source).toBe('direct');
    expect(last[0]!.revenueCents).toBe(5000);
  });

  it('multi-orders com mesmo touchpoint agregam em uma única linha', () => {
    const orders: OrderConversion[] = [
      {
        orderId: 'o6',
        revenueCents: 10000,
        touchpoints: [
          { source: 'google', medium: 'cpc', campaign: 'brand', ts: t('2026-04-01T10:00:00Z') },
        ],
      },
      {
        orderId: 'o7',
        revenueCents: 15000,
        touchpoints: [
          { source: 'google', medium: 'cpc', campaign: 'brand', ts: t('2026-04-02T10:00:00Z') },
        ],
      },
      {
        orderId: 'o8',
        revenueCents: 5000,
        touchpoints: [
          { source: 'meta', medium: 'paid_social', ts: t('2026-04-03T10:00:00Z') },
        ],
      },
    ];
    const last = computeAttribution(orders, 'last_click');
    expect(last).toHaveLength(2);
    const google = last.find((r) => r.source === 'google')!;
    const meta = last.find((r) => r.source === 'meta')!;
    expect(google.orders).toBe(2);
    expect(google.revenueCents).toBe(25000);
    expect(google.aov).toBe(12500);
    expect(meta.orders).toBe(1);
    expect(meta.revenueCents).toBe(5000);
    // ordenação desc por revenue
    expect(last[0]!.source).toBe('google');
  });

  it('ordena resultado desc por revenue', () => {
    const orders: OrderConversion[] = [
      {
        orderId: 'o9',
        revenueCents: 1000,
        touchpoints: [{ source: 'a', medium: 'x', ts: t('2026-04-01T10:00:00Z') }],
      },
      {
        orderId: 'o10',
        revenueCents: 9000,
        touchpoints: [{ source: 'b', medium: 'x', ts: t('2026-04-01T10:00:00Z') }],
      },
      {
        orderId: 'o11',
        revenueCents: 5000,
        touchpoints: [{ source: 'c', medium: 'x', ts: t('2026-04-01T10:00:00Z') }],
      },
    ];
    const rows = computeAttribution(orders, 'last_click');
    expect(rows.map((r) => r.source)).toEqual(['b', 'c', 'a']);
  });
});
