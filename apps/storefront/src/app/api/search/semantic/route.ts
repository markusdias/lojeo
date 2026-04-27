import { NextRequest, NextResponse } from 'next/server';
import { and, eq, ilike, or } from 'drizzle-orm';
import { db, products, productEmbeddings } from '@lojeo/db';
import {
  mockEmbedding,
  cosineSimilarity,
  decodeEmbedding,
} from '@lojeo/engine';

export const dynamic = 'force-dynamic';

const TENANT_ID =
  process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const DEFAULT_DIMENSIONS = 256;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface ResultItem {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  comparePriceCents: number | null;
  similarity: number;
  source: 'semantic' | 'fallback';
}

/**
 * GET /api/search/semantic?q=texto&limit=20
 *
 * V1: mockEmbedding determinístico em memória + varredura linear de embeddings
 * stored. Para 5k produtos + 256d, latência ~150-300ms na pior hipótese.
 *
 * V2: substituir por pgvector index ivfflat com ORDER BY embedding <=> $query
 * LIMIT N — busca em milissegundos mesmo com 100k+ produtos.
 *
 * Fallback ilike: se nenhum embedding estiver stored OU erro inesperado,
 * caímos em LIKE simples no name/description/sku para a loja não quebrar.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Math.min(
    Math.max(1, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : DEFAULT_LIMIT),
    MAX_LIMIT,
  );

  if (!q) {
    return NextResponse.json({ results: [], q, source: 'empty' });
  }

  try {
    // 1. Tenta busca semântica
    const queryVec = mockEmbedding(q, DEFAULT_DIMENSIONS);
    const allEmbeddings = await db
      .select({
        productId: productEmbeddings.productId,
        embedding: productEmbeddings.embedding,
      })
      .from(productEmbeddings)
      .where(eq(productEmbeddings.tenantId, TENANT_ID));

    if (allEmbeddings.length === 0) {
      return await fallbackIlike(q, limit);
    }

    // Calcula similaridades em memória
    const scored: { productId: string; similarity: number }[] = [];
    for (const row of allEmbeddings) {
      const vec = decodeEmbedding(row.embedding);
      if (!vec) continue;
      const sim = cosineSimilarity(queryVec, vec);
      if (sim > 0) {
        scored.push({ productId: row.productId, similarity: sim });
      }
    }

    if (scored.length === 0) {
      return await fallbackIlike(q, limit);
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    const top = scored.slice(0, limit);

    // Hidrata produtos active
    const productRows = await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        priceCents: products.priceCents,
        comparePriceCents: products.comparePriceCents,
        status: products.status,
      })
      .from(products)
      .where(and(eq(products.tenantId, TENANT_ID), eq(products.status, 'active')));

    const byId = new Map(productRows.map((p) => [p.id, p]));
    const results: ResultItem[] = [];
    for (const s of top) {
      const p = byId.get(s.productId);
      if (!p) continue;
      results.push({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        comparePriceCents: p.comparePriceCents,
        similarity: Number(s.similarity.toFixed(4)),
        source: 'semantic',
      });
      if (results.length >= limit) break;
    }
    if (results.length === 0) {
      return await fallbackIlike(q, limit);
    }

    return NextResponse.json({
      q,
      source: 'semantic',
      count: results.length,
      results,
    });
  } catch (err) {
    console.warn(
      '[semantic-search] error, falling back to ilike:',
      err instanceof Error ? err.message : err,
    );
    return await fallbackIlike(q, limit);
  }
}

async function fallbackIlike(q: string, limit: number) {
  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      priceCents: products.priceCents,
      comparePriceCents: products.comparePriceCents,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, TENANT_ID),
        eq(products.status, 'active'),
        or(
          ilike(products.name, `%${q}%`),
          ilike(products.description ?? '', `%${q}%`),
          ilike(products.sku ?? '', `%${q}%`),
        )!,
      ),
    )
    .limit(limit);

  const results: ResultItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    priceCents: r.priceCents,
    comparePriceCents: r.comparePriceCents,
    similarity: 0,
    source: 'fallback',
  }));

  return NextResponse.json({
    q,
    source: 'fallback',
    count: results.length,
    results,
  });
}
