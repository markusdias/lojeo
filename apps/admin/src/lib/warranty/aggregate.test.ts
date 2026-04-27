import { describe, it, expect } from 'vitest';
import { aggregateWarrantiesByCustomer, type WarrantyAggregateInput } from './aggregate';

const now = new Date('2026-04-27T00:00:00Z');

function input(opts: Partial<WarrantyAggregateInput> = {}): WarrantyAggregateInput {
  return {
    customerEmail: 'a@x.com',
    orderId: 'o1',
    orderItemId: 'oi1',
    productId: 'p1',
    productName: 'Anel',
    warrantyMonths: 12,
    startsAt: new Date('2025-06-01T00:00:00Z'), // expira ~2026-05-26 → ~29 dias
    ...opts,
  };
}

describe('aggregateWarrantiesByCustomer', () => {
  it('vazio retorna []', () => {
    expect(aggregateWarrantiesByCustomer([], 30, now)).toEqual([]);
  });

  it('warranty expira em 29d com window 30d → incluído', () => {
    const r = aggregateWarrantiesByCustomer([input()], 30, now);
    expect(r).toHaveLength(1);
    expect(r[0]!.customerEmail).toBe('a@x.com');
    expect(r[0]!.itemCount).toBe(1);
  });

  it('warranty expira em 29d com window 7d → excluído', () => {
    expect(aggregateWarrantiesByCustomer([input()], 7, now)).toEqual([]);
  });

  it('warranty já expirada skip', () => {
    const old = input({ startsAt: new Date('2024-01-01T00:00:00Z') }); // expirou ~2025-01
    expect(aggregateWarrantiesByCustomer([old], 90, now)).toEqual([]);
  });

  it('warrantyMonths=0 skip', () => {
    expect(aggregateWarrantiesByCustomer([input({ warrantyMonths: 0 })], 30, now)).toEqual([]);
  });

  it('null email skip', () => {
    expect(aggregateWarrantiesByCustomer([input({ customerEmail: null })], 30, now)).toEqual([]);
  });

  it('agrupa multiple items por customer', () => {
    const items = [
      input({ orderItemId: 'oi1', productName: 'Anel A' }),
      input({ orderItemId: 'oi2', productName: 'Brinco B' }),
      input({ customerEmail: 'b@x.com', orderItemId: 'oi3', productName: 'Pulseira' }),
    ];
    const r = aggregateWarrantiesByCustomer(items, 60, now);
    expect(r).toHaveLength(2);
    const a = r.find((x) => x.customerEmail === 'a@x.com')!;
    expect(a.itemCount).toBe(2);
    expect(a.expiringSoon).toHaveLength(2);
  });

  it('ordena por earliestExpiresAt ascending', () => {
    // late expira em ~75d, early em ~45d (ambos dentro window 90)
    const items = [
      input({ customerEmail: 'late@x.com', startsAt: new Date('2025-07-15T00:00:00Z') }),
      input({ customerEmail: 'early@x.com', startsAt: new Date('2025-06-15T00:00:00Z') }),
    ];
    const r = aggregateWarrantiesByCustomer(items, 90, now);
    expect(r).toHaveLength(2);
    expect(r[0]!.customerEmail).toBe('early@x.com');
    expect(r[1]!.customerEmail).toBe('late@x.com');
  });
});
