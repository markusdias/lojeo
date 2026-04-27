import { describe, it, expect } from 'vitest';
import {
  readAffiliateRefFromMetadata,
  planReconciliation,
  aggregatePlansByAffiliate,
  type ReconcileAffiliateRow,
  type ReconcileOrderRow,
} from './reconcile';

describe('readAffiliateRefFromMetadata', () => {
  it('extrai ref string', () => {
    expect(readAffiliateRefFromMetadata({ affiliateRef: 'ABC123' })).toBe('ABC123');
  });

  it('uppercase + sanitiza', () => {
    expect(readAffiliateRefFromMetadata({ affiliateRef: 'abc-xyz' })).toBe('ABC-XYZ');
  });

  it('null/undefined retorna null', () => {
    expect(readAffiliateRefFromMetadata(null)).toBeNull();
    expect(readAffiliateRefFromMetadata(undefined)).toBeNull();
    expect(readAffiliateRefFromMetadata({})).toBeNull();
  });

  it('non-object retorna null', () => {
    expect(readAffiliateRefFromMetadata('string')).toBeNull();
    expect(readAffiliateRefFromMetadata(123)).toBeNull();
  });

  it('caracteres especiais sanitizados → vazio retorna null', () => {
    expect(readAffiliateRefFromMetadata({ affiliateRef: '@#$%' })).toBeNull();
  });
});

describe('planReconciliation', () => {
  const aff1: ReconcileAffiliateRow = {
    id: 'aff-1',
    code: 'CODE1',
    commissionBps: 1000, // 10%
    active: true,
  };
  const inactive: ReconcileAffiliateRow = {
    id: 'aff-2',
    code: 'INACTIVE',
    commissionBps: 1000,
    active: false,
  };
  const map = new Map<string, ReconcileAffiliateRow>([
    ['CODE1', aff1],
    ['INACTIVE', inactive],
  ]);

  it('order paid + affiliateRef ativo → plan com commission', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 10000, metadata: { affiliateRef: 'CODE1' }, paidAt: new Date() },
    ];
    const plans = planReconciliation(orders, map, new Set());
    expect(plans).toHaveLength(1);
    expect(plans[0]!.commissionCents).toBe(1000);
    expect(plans[0]!.affiliateLinkId).toBe('aff-1');
  });

  it('order não pago é skipped', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 10000, metadata: { affiliateRef: 'CODE1' }, paidAt: null },
    ];
    expect(planReconciliation(orders, map, new Set())).toEqual([]);
  });

  it('order já reconciled (alreadyReconciledOrderIds) skip', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 10000, metadata: { affiliateRef: 'CODE1' }, paidAt: new Date() },
    ];
    const plans = planReconciliation(orders, map, new Set(['o1']));
    expect(plans).toEqual([]);
  });

  it('affiliate inativo skip', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 10000, metadata: { affiliateRef: 'INACTIVE' }, paidAt: new Date() },
    ];
    expect(planReconciliation(orders, map, new Set())).toEqual([]);
  });

  it('código não cadastrado skip', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 10000, metadata: { affiliateRef: 'UNKNOWN' }, paidAt: new Date() },
    ];
    expect(planReconciliation(orders, map, new Set())).toEqual([]);
  });

  it('commission floor cents', () => {
    const orders: ReconcileOrderRow[] = [
      { orderId: 'o1', totalCents: 99, metadata: { affiliateRef: 'CODE1' }, paidAt: new Date() },
    ];
    const plans = planReconciliation(orders, map, new Set());
    expect(plans[0]!.commissionCents).toBe(9); // 9.9 → 9
  });
});

describe('aggregatePlansByAffiliate', () => {
  it('soma conversions + commission por affiliate', () => {
    const plans = [
      { orderId: 'o1', affiliateLinkId: 'aff-1', affiliateCode: 'A', commissionCents: 1000 },
      { orderId: 'o2', affiliateLinkId: 'aff-1', affiliateCode: 'A', commissionCents: 500 },
      { orderId: 'o3', affiliateLinkId: 'aff-2', affiliateCode: 'B', commissionCents: 2000 },
    ];
    const aggs = aggregatePlansByAffiliate(plans);
    expect(aggs).toHaveLength(2);
    const a1 = aggs.find((a) => a.affiliateLinkId === 'aff-1')!;
    expect(a1.conversionCount).toBe(2);
    expect(a1.totalCommissionCents).toBe(1500);
    expect(a1.orderIds).toEqual(['o1', 'o2']);
  });

  it('vazio retorna []', () => {
    expect(aggregatePlansByAffiliate([])).toEqual([]);
  });
});
