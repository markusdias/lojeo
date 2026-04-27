import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db, products, productEmbeddings } from '@lojeo/db';
import { mockEmbedding, encodeEmbedding, decodeEmbedding } from '@lojeo/engine';
import { auth } from '../../../auth';
import { recordAuditLog, requirePermission } from '../../../lib/roles';

export const dynamic = 'force-dynamic';

const TENANT_ID =
  process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const DEFAULT_DIMENSIONS = 256;
const DEFAULT_MODEL = 'mock-deterministic-256';

function buildEmbeddingText(p: {
  name: string;
  description: string | null;
  customFields: unknown;
}): string {
  const parts: string[] = [p.name];
  if (p.description) parts.push(p.description);
  if (p.customFields && typeof p.customFields === 'object') {
    const cf = p.customFields as Record<string, unknown>;
    for (const [k, v] of Object.entries(cf)) {
      if (v == null) continue;
      if (typeof v === 'string') {
        parts.push(`${k}:${v}`);
      } else if (typeof v === 'number' || typeof v === 'boolean') {
        parts.push(`${k}:${String(v)}`);
      } else if (Array.isArray(v)) {
        parts.push(`${k}:${v.filter((x) => typeof x === 'string').join(' ')}`);
      }
    }
  }
  return parts.join(' ');
}

/**
 * POST /api/embeddings — recalcula embeddings de todos os produtos active do tenant.
 *
 * V1: usa mockEmbedding determinístico (sem custo). Suporta até ~5k produtos
 * por tenant em batch sem degradação significativa.
 *
 * V2: trocar mockEmbedding por chamada real ao OpenAI/Cohere com batching de
 * 100-500 inputs por request, controle de rate limit e cache opcional por hash
 * do texto (skip recompute se texto não mudou desde último computedAt).
 */
export async function POST(_req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const t0 = Date.now();
  const tid = TENANT_ID;

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      customFields: products.customFields,
    })
    .from(products)
    .where(and(eq(products.tenantId, tid), eq(products.status, 'active')));

  let processed = 0;
  let failed = 0;

  for (const p of rows) {
    try {
      const text = buildEmbeddingText(p);
      const vec = mockEmbedding(text, DEFAULT_DIMENSIONS);
      const encoded = encodeEmbedding(vec);

      // UPSERT: ON CONFLICT (product_id) DO UPDATE
      await db
        .insert(productEmbeddings)
        .values({
          productId: p.id,
          tenantId: tid,
          embedding: encoded,
          model: DEFAULT_MODEL,
          dimensions: DEFAULT_DIMENSIONS,
        })
        .onConflictDoUpdate({
          target: productEmbeddings.productId,
          set: {
            embedding: encoded,
            model: DEFAULT_MODEL,
            dimensions: DEFAULT_DIMENSIONS,
            computedAt: sql`now()`,
          },
        });
      processed++;
    } catch (err) {
      failed++;
      console.warn(
        '[embeddings] failed productId=%s: %s',
        p.id,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const durationMs = Date.now() - t0;

  await recordAuditLog({
    session,
    action: 'embeddings.recomputed',
    entityType: 'product_embeddings',
    metadata: {
      processed,
      failed,
      total: rows.length,
      model: DEFAULT_MODEL,
      dimensions: DEFAULT_DIMENSIONS,
      durationMs,
    },
  });

  return NextResponse.json({
    ok: true,
    processed,
    failed,
    total: rows.length,
    durationMs,
    model: DEFAULT_MODEL,
    dimensions: DEFAULT_DIMENSIONS,
  });
}

/**
 * GET /api/embeddings?productId=X — retorna embedding stored ou null.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get('productId');
  if (!productId) {
    return NextResponse.json(
      { error: 'productId required' },
      { status: 400 },
    );
  }

  const [row] = await db
    .select()
    .from(productEmbeddings)
    .where(
      and(
        eq(productEmbeddings.productId, productId),
        eq(productEmbeddings.tenantId, TENANT_ID),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ embedding: null });
  }

  const decoded = decodeEmbedding(row.embedding);
  return NextResponse.json({
    productId: row.productId,
    model: row.model,
    dimensions: row.dimensions,
    computedAt: row.computedAt,
    embedding: decoded,
  });
}
