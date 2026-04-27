// Affiliate reconciliation — detecta orders pagos com affiliateRef em metadata,
// incrementa conversions + pendingCents do affiliate_link.
//
// Helper puro recebe rows + executa updates via callback injetado. Tests mockam.

export interface ReconcileOrderRow {
  orderId: string;
  totalCents: number;
  metadata: unknown;
  paidAt: Date | null;
}

export interface ReconcileAffiliateRow {
  id: string;
  code: string;
  commissionBps: number;
  active: boolean;
}

export interface ReconcileTrackingRow {
  /** Reconcile já marcado pra esse orderId? */
  orderId: string;
  affiliateLinkId: string;
}

export interface ReconcilePlan {
  /** Order considerado pra reconcile (paid + tem affiliateRef + ainda não reconciled). */
  orderId: string;
  affiliateLinkId: string;
  affiliateCode: string;
  commissionCents: number;
}

export function readAffiliateRefFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const ref = (metadata as { affiliateRef?: unknown }).affiliateRef;
  if (typeof ref !== 'string' || !ref) return null;
  return ref.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || null;
}

export function planReconciliation(
  orders: ReconcileOrderRow[],
  affiliatesByCode: Map<string, ReconcileAffiliateRow>,
  alreadyReconciledOrderIds: Set<string>,
): ReconcilePlan[] {
  const plans: ReconcilePlan[] = [];
  for (const o of orders) {
    if (!o.paidAt) continue;
    if (alreadyReconciledOrderIds.has(o.orderId)) continue;
    const ref = readAffiliateRefFromMetadata(o.metadata);
    if (!ref) continue;
    const affiliate = affiliatesByCode.get(ref);
    if (!affiliate || !affiliate.active) continue;
    const commissionCents = Math.floor((o.totalCents * affiliate.commissionBps) / 10000);
    plans.push({
      orderId: o.orderId,
      affiliateLinkId: affiliate.id,
      affiliateCode: ref,
      commissionCents,
    });
  }
  return plans;
}

/**
 * Agrega por affiliateLinkId pra reduzir UPDATEs ao DB.
 */
export interface AffiliateAggregate {
  affiliateLinkId: string;
  conversionCount: number;
  totalCommissionCents: number;
  orderIds: string[];
}

export function aggregatePlansByAffiliate(plans: ReconcilePlan[]): AffiliateAggregate[] {
  const map = new Map<string, AffiliateAggregate>();
  for (const p of plans) {
    let agg = map.get(p.affiliateLinkId);
    if (!agg) {
      agg = {
        affiliateLinkId: p.affiliateLinkId,
        conversionCount: 0,
        totalCommissionCents: 0,
        orderIds: [],
      };
      map.set(p.affiliateLinkId, agg);
    }
    agg.conversionCount++;
    agg.totalCommissionCents += p.commissionCents;
    agg.orderIds.push(p.orderId);
  }
  return [...map.values()];
}
