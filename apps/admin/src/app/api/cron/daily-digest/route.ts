import { NextRequest, NextResponse } from 'next/server';
import { db, tenants } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { sendEmail, render, DailyDigest, getStoreEmailConfig, emailSubjects } from '@lojeo/email';
import { formatMoney, asSupportedCurrency } from '@lojeo/engine';
import { TENANT_ID } from '../../../../lib/roles';
import { authorizeCronRequest } from '../../../../lib/cron-auth';
import { aggregateDailyDigest, formatDailyDigestDateLabel } from '../../../../lib/digest/daily';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

interface DigestNotificationConfig {
  email?: { enabled?: boolean; recipientsCsv?: string; dailyDigest?: { enabled?: boolean; hour?: number } };
}

export async function POST(req: NextRequest) {
  const auth = await authorizeCronRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const tid = TENANT_ID;
  const conf = getStoreEmailConfig();

  try {
    const [tenantRow] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, tid))
      .limit(1);

    const cfg = (tenantRow?.config ?? {}) as { notifications?: DigestNotificationConfig };
    const notifConfig = cfg.notifications ?? {};
    const dailyEnabled = notifConfig.email?.dailyDigest?.enabled !== false;
    const recipients = (notifConfig.email?.recipientsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!dailyEnabled) {
      return NextResponse.json({ ok: true, skipped: 'daily_digest_disabled' });
    }
    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'no_recipients' });
    }

    const snapshot = await aggregateDailyDigest({ tenantId: tid });
    const dateLabel = formatDailyDigestDateLabel(snapshot.generatedAt, conf.locale);
    const currency = asSupportedCurrency(conf.currency);
    const revenueLabel = formatMoney(snapshot.revenueCents, currency);

    const html = await render(
      DailyDigest({
        storeName: conf.storeName,
        dateLabel,
        ordersCount: snapshot.ordersCount,
        revenueLabel,
        ticketsOpenCount: snapshot.ticketsOpenCount,
        lowStockCount: snapshot.lowStockCount,
        criticalAlertsCount: snapshot.criticalAlertsCount,
        dashboardUrl: `${conf.storefrontBase.replace('//joias.', '//admin.').replace('//www.', '//admin.')}/dashboard`,
        locale: conf.locale,
        supportEmail: conf.fromEmail,
      }),
    );

    const subj = emailSubjects(conf.locale);
    const subject = conf.locale === 'en-US'
      ? `${conf.storeName} · Daily summary · ${dateLabel}`
      : `${conf.storeName} · Resumo de hoje · ${dateLabel}`;
    void subj; // mantém import consistente — V2 pode adicionar dailyDigest a emailSubjects

    const result = await sendEmail({
      to: recipients,
      from: conf.fromEmail,
      subject,
      html,
    });

    return NextResponse.json({
      ok: true,
      delivered: result.delivered,
      snapshot,
      recipients: recipients.length,
    });
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'daily-digest cron failed');
    return NextResponse.json({ ok: false, error: 'digest_failed' }, { status: 500 });
  }
}
