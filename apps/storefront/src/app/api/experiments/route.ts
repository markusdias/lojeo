import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db, experiments, experimentAssignments, experimentEvents, selectVariant, type Variant } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// ── Self-seed de experimentos canônicos do storefront ────────────────────────
// Quando uma key requisitada é canônica e ainda não existe no DB, criamos com
// os defaults (idempotente via unique index uniq_experiments_tenant_key).
// Evita depender de migration manual via admin para que o A/B funcione no
// primeiro deploy.
interface SelfSeedSpec {
  key: string;
  name: string;
  description: string;
  variants: Variant[];
  status: 'active';
  targetMetric: 'conversion';
}

const SELF_SEED: SelfSeedSpec[] = [
  {
    key: 'homepage_personalization',
    name: 'Homepage personalization vs default',
    description:
      'Compara homepage com hero personalizado + RecommendedForYou (variante "personalized") vs hero estático sem recomendações (variante "control"). Mede conversion via cart_add.',
    variants: [
      { key: 'control', name: 'Controle (default)', weight: 50 },
      { key: 'personalized', name: 'Personalizado', weight: 50 },
    ],
    status: 'active',
    targetMetric: 'conversion',
  },
];

async function ensureSelfSeed(requestedKeys: string[]): Promise<void> {
  const seedsToCheck = SELF_SEED.filter((s) => requestedKeys.includes(s.key));
  if (seedsToCheck.length === 0) return;

  const existing = await db
    .select({ key: experiments.key })
    .from(experiments)
    .where(and(eq(experiments.tenantId, TENANT_ID), inArray(experiments.key, seedsToCheck.map((s) => s.key))));

  const existingKeys = new Set(existing.map((e) => e.key));
  const missing = seedsToCheck.filter((s) => !existingKeys.has(s.key));
  if (missing.length === 0) return;

  for (const spec of missing) {
    await db
      .insert(experiments)
      .values({
        tenantId: TENANT_ID,
        key: spec.key,
        name: spec.name,
        description: spec.description,
        status: spec.status,
        targetMetric: spec.targetMetric,
        variants: spec.variants,
        startedAt: new Date(),
      })
      .onConflictDoNothing();
  }
}

/**
 * GET /api/experiments?keys=hero-test,checkout-cta&anonymousId=abc123
 *
 * Retorna assignments do storefront para um set de experimentos ativos.
 * Determinístico por anonymousId — mesma sessão sempre cai na mesma variante.
 * Persiste assignment em DB (idempotente via unique constraint) + emite exposure event.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const keysParam = url.searchParams.get('keys') ?? '';
  const anonymousId = url.searchParams.get('anonymousId')?.trim();

  if (!anonymousId || anonymousId.length < 4) {
    return NextResponse.json({ error: 'anonymousId required' }, { status: 400 });
  }
  const keys = keysParam.split(',').map(s => s.trim()).filter(Boolean);
  if (keys.length === 0) return NextResponse.json({ assignments: {} });

  // Garante experimentos canônicos seedados antes do query (idempotente)
  try {
    await ensureSelfSeed(keys);
  } catch {
    // best-effort — falha de seed não bloqueia leitura
  }

  // Fetch only active experiments matching keys
  const activeExperiments = await db.select().from(experiments)
    .where(and(
      eq(experiments.tenantId, TENANT_ID),
      eq(experiments.status, 'active'),
      inArray(experiments.key, keys),
    ));

  if (activeExperiments.length === 0) return NextResponse.json({ assignments: {} });

  const assignments: Record<string, { variantKey: string; payload: Record<string, unknown> | null }> = {};

  for (const exp of activeExperiments) {
    const variants = (exp.variants ?? []) as Variant[];
    if (!Array.isArray(variants) || variants.length === 0) continue;

    const chosen = selectVariant(exp.key, anonymousId, variants);
    if (!chosen) continue;

    assignments[exp.key] = {
      variantKey: chosen.key,
      payload: (chosen.payload ?? null) as Record<string, unknown> | null,
    };

    // Persist assignment (idempotent via unique constraint)
    void db.insert(experimentAssignments).values({
      tenantId: TENANT_ID,
      experimentId: exp.id,
      anonymousId,
      variantKey: chosen.key,
    }).onConflictDoNothing().catch(() => null);

    // Emit exposure event (sample once per page-load — duplicates ok via assignment idempotency upstream)
    void db.insert(experimentEvents).values({
      tenantId: TENANT_ID,
      experimentId: exp.id,
      variantKey: chosen.key,
      anonymousId,
      eventType: 'exposure',
    }).catch(() => null);
  }

  return NextResponse.json({ assignments });
}

/**
 * POST /api/experiments
 * body: { experimentKey, variantKey, anonymousId, eventType, value?, metadata? }
 * Registra evento de conversão / clique / custom.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    experimentKey?: string; variantKey?: string; anonymousId?: string;
    eventType?: string; value?: number; metadata?: Record<string, unknown>;
  };

  const { experimentKey, variantKey, anonymousId, eventType } = body;
  if (!experimentKey || !variantKey || !anonymousId || !eventType) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
  }

  const [exp] = await db.select({ id: experiments.id }).from(experiments)
    .where(and(eq(experiments.tenantId, TENANT_ID), eq(experiments.key, experimentKey)))
    .limit(1);
  if (!exp) return NextResponse.json({ error: 'experiment_not_found' }, { status: 404 });

  await db.insert(experimentEvents).values({
    tenantId: TENANT_ID,
    experimentId: exp.id,
    variantKey,
    anonymousId,
    eventType,
    value: typeof body.value === 'number' ? Math.round(body.value) : 0,
    metadata: body.metadata ?? {},
  });

  return NextResponse.json({ ok: true });
}
