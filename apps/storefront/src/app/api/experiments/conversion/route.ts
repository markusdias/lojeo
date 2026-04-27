import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, experiments, experimentEvents } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

/**
 * POST /api/experiments/conversion
 * body: { experimentKey, variantKey, anonymousId, value? }
 *
 * Endpoint dedicado a registrar UMA conversão de experimento. Difere do
 * `POST /api/experiments` (genérico, aceita qualquer eventType): aqui o
 * eventType é fixo `conversion` e value default = 1.
 *
 * Idempotência fica a cargo do caller (hook useExperimentConversion controla
 * sessionStorage para disparar uma única vez por anonymousId+experimentKey).
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    experimentKey?: string;
    variantKey?: string;
    anonymousId?: string;
    value?: number;
    metadata?: Record<string, unknown>;
  };

  const { experimentKey, variantKey, anonymousId } = body;
  if (!experimentKey || !variantKey || !anonymousId) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const [exp] = await db
    .select({ id: experiments.id })
    .from(experiments)
    .where(and(eq(experiments.tenantId, TENANT_ID), eq(experiments.key, experimentKey)))
    .limit(1);

  if (!exp) return NextResponse.json({ error: 'experiment_not_found' }, { status: 404 });

  await db.insert(experimentEvents).values({
    tenantId: TENANT_ID,
    experimentId: exp.id,
    variantKey,
    anonymousId,
    eventType: 'conversion',
    value: typeof body.value === 'number' && Number.isFinite(body.value) ? Math.round(body.value) : 1,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
