import { db, products } from '@lojeo/db';
import { eq, and, ilike, or } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getActiveTemplate } from '../../template';
import { PLPFilters } from '../produtos/plp-filters';

export const dynamic = 'force-dynamic';

interface BuscaProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ searchParams }: BuscaProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = param(sp['q']) ?? '';
  return {
    title: q ? `Busca: "${q}" — Atelier` : 'Busca — Atelier',
    robots: { index: false },
  };
}

export default async function BuscaPage({ searchParams }: BuscaProps) {
  const sp = await searchParams;
  const tpl = await getActiveTemplate();
  const tid = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
  const q = param(sp['q']) ?? '';

  const conditions = [eq(products.tenantId, tid), eq(products.status, 'active')];
  if (q.trim()) {
    conditions.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.description ?? '', `%${q}%`),
        ilike(products.sku ?? '', `%${q}%`),
      )!,
    );
  }

  const results = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .limit(100);

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Resultados</p>
        <h1 style={{ margin: '0 0 8px' }}>
          {q ? `"${q}"` : 'Todas as peças'}
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>
          {results.length} {results.length === 1 ? 'peça encontrada' : 'peças encontradas'}
        </p>
      </div>

      <PLPFilters
        products={results.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          comparePriceCents: p.comparePriceCents,
          customFields: p.customFields as Record<string, unknown>,
        }))}
        currency={tpl.currency}
        initialQ={q}
      />
    </div>
  );
}
