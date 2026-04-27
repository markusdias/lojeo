import { NextRequest, NextResponse } from 'next/server';
import { db, orders, npsResponses } from '@lojeo/db';
import { and, eq, isNotNull, sql, gte, lte } from 'drizzle-orm';
import { sendEmail, render, NpsSurvey, getStoreEmailConfig } from '@lojeo/email';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

/**
 * Cron daily — detecta orders entregues há 7 dias (D+7) sem NPS response,
 * envia email survey com 0-10 score links pra storefront.
 *
 * Janela ±12h (5d18h até 6d18h após delivery) pra evitar dupla envio
 * em runs sucessivos do cron.
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const conf = getStoreEmailConfig();
  const now = Date.now();
  const lower = new Date(now - 7 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000); // 7d12h atrás
  const upper = new Date(now - 7 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000); // 7d-12h atrás

  try {
    // Orders entregues na janela
    const candidates = await db
      .select({
        orderId: orders.id,
        orderNumber: orders.orderNumber,
        customerEmail: orders.customerEmail,
        deliveredAt: orders.deliveredAt,
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tid),
          isNotNull(orders.deliveredAt),
          gte(orders.deliveredAt, lower),
          lte(orders.deliveredAt, upper),
          isNotNull(orders.customerEmail),
        ),
      );

    let emailsSent = 0;
    let skipped = 0;

    for (const c of candidates) {
      // Dedup: já tem NPS response com surveyTrigger='delivery_d7' pra este order?
      const existing = await db
        .select({ id: npsResponses.id })
        .from(npsResponses)
        .where(
          and(
            eq(npsResponses.tenantId, tid),
            eq(npsResponses.relatedOrderId, c.orderId),
            eq(npsResponses.surveyTrigger, 'delivery_d7'),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const surveyBaseUrl = `${conf.storefrontBase}/nps?orderId=${encodeURIComponent(c.orderId)}&trigger=delivery_d7`;

      try {
        const html = await render(
          NpsSurvey({
            storeName: conf.storeName,
            customerName: c.customerEmail?.split('@')[0],
            orderCode: c.orderNumber,
            surveyBaseUrl,
            locale: conf.locale,
            supportEmail: conf.fromEmail,
          }),
        );
        const subject = conf.locale === 'en-US'
          ? `${conf.storeName} · How was your order ${c.orderNumber}?`
          : `${conf.storeName} · Como foi seu pedido ${c.orderNumber}?`;
        const result = await sendEmail({
          to: c.customerEmail!,
          from: conf.fromEmail,
          subject,
          html,
        });
        if (result.delivered) emailsSent++;
      } catch (err) {
        logger.warn({ err: err instanceof Error ? err.message : err, orderId: c.orderId }, 'nps survey send failed');
      }
    }

    return NextResponse.json({
      ok: true,
      candidates: candidates.length,
      emailsSent,
      skipped,
      window: { lower: lower.toISOString(), upper: upper.toISOString() },
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'nps-survey cron failed');
    return NextResponse.json({ ok: false, error: 'cron_failed' }, { status: 500 });
  }
}

void sql; // mantém referência não usada no escopo (caller futuro pode add count agg).
