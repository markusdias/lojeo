import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db, experiments, experimentEvents } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';
import { parseOrError, experimentCreateSchema } from '../../../lib/validate';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db.select()
    .from(experiments)
    .where(eq(experiments.tenantId, TENANT_ID))
    .orderBy(desc(experiments.createdAt));

  // Aggregate event counts por experiment
  const counts = await db.select({
    experimentId: experimentEvents.experimentId,
    variantKey: experimentEvents.variantKey,
    eventType: experimentEvents.eventType,
    n: sql<number>`COUNT(*)::int`,
  })
    .from(experimentEvents)
    .where(eq(experimentEvents.tenantId, TENANT_ID))
    .groupBy(experimentEvents.experimentId, experimentEvents.variantKey, experimentEvents.eventType);

  const stats: Record<string, Record<string, { exposures: number; conversions: number }>> = {};
  for (const c of counts) {
    if (!stats[c.experimentId]) stats[c.experimentId] = {};
    if (!stats[c.experimentId]![c.variantKey]) stats[c.experimentId]![c.variantKey] = { exposures: 0, conversions: 0 };
    if (c.eventType === 'exposure') stats[c.experimentId]![c.variantKey]!.exposures = Number(c.n);
    else if (c.eventType === 'conversion') stats[c.experimentId]![c.variantKey]!.conversions = Number(c.n);
  }

  return NextResponse.json({ experiments: rows, stats });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'settings', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const parsed = await parseOrError(req, experimentCreateSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    const [created] = await db.insert(experiments).values({
      tenantId: TENANT_ID,
      key: parsed.key,
      name: parsed.name,
      description: parsed.description ?? null,
      targetMetric: parsed.targetMetric || 'conversion',
      variants: parsed.variants,
      audience: parsed.audience ?? {},
      status: 'draft',
    }).returning();

    await recordAuditLog({
      session,
      action: 'experiment.create',
      entityType: 'experiment',
      entityId: created?.id ?? null,
      after: { key: parsed.key, name: parsed.name, variants: parsed.variants },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_experiments_tenant_key')) {
      return NextResponse.json({ error: `key '${parsed.key}' já existe` }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
