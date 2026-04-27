import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, scheduledReports } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';
import { parseOrError } from '../../../../lib/validate';

export const dynamic = 'force-dynamic';

const REPORT_TYPES = ['revenue_summary', 'conversion_funnel', 'inventory_low'] as const;

const CRON_REGEX = /^[\d*/,\-\s]+$/;

const reportPatchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  reportType: z.enum(REPORT_TYPES).optional(),
  cronExpression: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .refine((s) => s.split(/\s+/).length === 5, 'cron deve ter 5 campos')
    .refine((s) => CRON_REGEX.test(s), 'cron com caracteres inválidos')
    .optional(),
  destinations: z
    .object({
      emails: z.array(z.string().email()).default([]),
      channels: z.array(z.string().min(1)).default([]).optional(),
    })
    .optional(),
  filters: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const parsed = await parseOrError(req, reportPatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const updates: Record<string, unknown> = {};
  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.reportType !== undefined) updates.reportType = parsed.reportType;
  if (parsed.cronExpression !== undefined) updates.cronExpression = parsed.cronExpression;
  if (parsed.destinations !== undefined) updates.destinations = parsed.destinations;
  if (parsed.filters !== undefined) updates.filters = parsed.filters;
  if (parsed.active !== undefined) updates.active = parsed.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nenhum campo para atualizar' }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(scheduledReports)
      .set(updates)
      .where(and(eq(scheduledReports.id, id), eq(scheduledReports.tenantId, TENANT_ID)))
      .returning();

    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await recordAuditLog({
      session,
      action: 'scheduled_report.update',
      entityType: 'scheduled_report',
      entityId: id,
      after: updates,
    });

    return NextResponse.json({ report: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  try {
    const [deleted] = await db
      .delete(scheduledReports)
      .where(and(eq(scheduledReports.id, id), eq(scheduledReports.tenantId, TENANT_ID)))
      .returning();

    if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await recordAuditLog({
      session,
      action: 'scheduled_report.delete',
      entityType: 'scheduled_report',
      entityId: id,
      before: { name: deleted.name, reportType: deleted.reportType },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
