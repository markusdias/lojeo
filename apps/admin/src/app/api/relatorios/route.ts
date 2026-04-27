import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, scheduledReports } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';
import { parseOrError } from '../../../lib/validate';

export const dynamic = 'force-dynamic';

const REPORT_TYPES = ['revenue_summary', 'conversion_funnel', 'inventory_low'] as const;

// Cron simplificado: 5 fields separados por espaço (min hour day month dow).
// Aceita * / , - 0-9. Não validamos semântica, apenas shape.
const CRON_REGEX = /^[\d*/,\-\s]+$/;

const cronSchema = z
  .string()
  .trim()
  .min(1, 'cron obrigatório')
  .max(40)
  .refine((s) => s.split(/\s+/).length === 5, 'cron deve ter 5 campos (min hour day month dow)')
  .refine((s) => CRON_REGEX.test(s), 'cron com caracteres inválidos');

const destinationsSchema = z
  .object({
    emails: z.array(z.string().email('email inválido')).default([]),
    channels: z.array(z.string().min(1)).default([]).optional(),
  })
  .strict();

const reportCreateSchema = z.object({
  name: z.string().trim().min(1, 'name obrigatório').max(200),
  reportType: z.enum(REPORT_TYPES),
  cronExpression: cronSchema,
  destinations: destinationsSchema,
  filters: z.record(z.unknown()).default({}).optional(),
  active: z.boolean().default(true).optional(),
});

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'insights', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(scheduledReports)
    .where(eq(scheduledReports.tenantId, TENANT_ID))
    .orderBy(desc(scheduledReports.createdAt))
    .catch(() => []);

  return NextResponse.json({
    reports: rows,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const parsed = await parseOrError(req, reportCreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const [created] = await db
      .insert(scheduledReports)
      .values({
        tenantId: TENANT_ID,
        name: parsed.name,
        reportType: parsed.reportType,
        cronExpression: parsed.cronExpression,
        destinations: parsed.destinations,
        filters: parsed.filters ?? {},
        active: parsed.active ?? true,
      })
      .returning();

    await recordAuditLog({
      session,
      action: 'scheduled_report.create',
      entityType: 'scheduled_report',
      entityId: created?.id ?? null,
      after: {
        name: parsed.name,
        reportType: parsed.reportType,
        cronExpression: parsed.cronExpression,
      },
    });

    return NextResponse.json({ report: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
