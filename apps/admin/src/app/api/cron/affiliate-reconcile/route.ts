import { NextRequest, NextResponse } from 'next/server';
import { db, orders, affiliateLinks } from '@lojeo/db';
import { and, eq, gte, sql, isNotNull } from 'drizzle-orm';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';
import {
  readAffiliateRefFromMetadata,
  planReconciliation,
  aggregatePlansByAffiliate,
  type ReconcileAffiliateRow,
  type ReconcileOrderRow,
} from '../../../../lib/affiliates/reconcile';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

const LOOKBACK_DAYS = 30;

export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  try {
    // 1) Orders pagos no range com affiliateRef em metadata.
    const rows = await db
      .select({
        orderId: orders.id,
        totalCents: orders.totalCents,
        metadata: orders.metadata,
        paidAt: orders.paidAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tid),
          isNotNull(orders.paidAt),
          gte(orders.paidAt, since),
          sql`${orders.metadata} ? 'affiliateRef'`,
        ),
      );

    const orderRows: ReconcileOrderRow[] = rows.map((r) => ({
      orderId: r.orderId,
      totalCents: r.totalCents,
      metadata: r.metadata,
      paidAt: r.paidAt instanceof Date ? r.paidAt : r.paidAt ? new Date(r.paidAt) : null,
    }));

    // 2) Affiliate links ativos
    const affRows = await db
      .select({
        id: affiliateLinks.id,
        code: affiliateLinks.code,
        commissionBps: affiliateLinks.commissionBps,
        active: affiliateLinks.active,
      })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.tenantId, tid));

    const affiliatesByCode = new Map<string, ReconcileAffiliateRow>();
    for (const a of affRows) affiliatesByCode.set(a.code.toUpperCase(), a);

    // 3) Já reconciled = orders cuja metadata.affiliateReconciledAt presente.
    const reconciledIds = new Set<string>();
    for (const r of orderRows) {
      const md = (r.metadata ?? {}) as { affiliateReconciledAt?: unknown };
      if (md.affiliateReconciledAt) reconciledIds.add(r.orderId);
    }

    // 4) Compute plans + aggregate
    const plans = planReconciliation(orderRows, affiliatesByCode, reconciledIds);
    const aggregates = aggregatePlansByAffiliate(plans);

    // 5) Apply: increment counts + pending cents per affiliate
    for (const agg of aggregates) {
      try {
        await db.execute(sql`
          UPDATE affiliate_links
          SET conversions = conversions + ${agg.conversionCount},
              pending_cents = pending_cents + ${agg.totalCommissionCents},
              updated_at = NOW()
          WHERE id = ${agg.affiliateLinkId}
        `);
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : err, aff: agg.affiliateLinkId }, 'affiliate update failed');
      }
    }

    // 6) Marcar orders como reconciled (push affiliateReconciledAt na metadata)
    const reconciledOrderIds = plans.map((p) => p.orderId);
    if (reconciledOrderIds.length > 0) {
      const nowIso = new Date().toISOString();
      for (const orderId of reconciledOrderIds) {
        try {
          await db.execute(sql`
            UPDATE orders
            SET metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{affiliateReconciledAt}',
              to_jsonb(${nowIso}::text)
            ),
            updated_at = NOW()
            WHERE id = ${orderId}
          `);
        } catch {
          // Best-effort.
        }
      }
    }

    return NextResponse.json({
      ok: true,
      ordersScanned: orderRows.length,
      plansCreated: plans.length,
      affiliatesUpdated: aggregates.length,
      totalCommissionCents: plans.reduce((s, p) => s + p.commissionCents, 0),
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'affiliate reconcile failed');
    return NextResponse.json({ ok: false, error: 'reconcile_failed' }, { status: 500 });
  }
}

// Mantem readAffiliateRefFromMetadata referenced (consumer pode importar daqui via index futuro).
void readAffiliateRefFromMetadata;
