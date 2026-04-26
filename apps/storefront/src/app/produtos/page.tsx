import { db, products } from '@lojeo/db';
import { eq, and, lte, asc, desc, like, or, ilike } from 'drizzle-orm';
import type { Metadata } from 'next';
import { getActiveTemplate } from '../../template';
import { ProductCard } from '../../components/ui/product-card';
import { PLPFilters } from './plp-filters';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 24;

interface PLPProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({ searchParams }: PLPProps): Promise<Metadata> {
  const sp = await searchParams;
  const cat = param(sp['categoria']);
  const catLabels: Record<string, string> = { aneis: 'Anéis', brincos: 'Brincos', colares: 'Colares', pulseiras: 'Pulseiras' };
  const label = cat ? (catLabels[cat] ?? cat) : 'Todas as peças';
  return {
    title: `${label} — Atelier`,
    description: `Explore nossa coleção de ${label.toLowerCase()} em ouro 18k e prata 925.`,
  };
}

export default async function PLP({ searchParams }: PLPProps) {
  const sp = await searchParams;
  const tpl = await getActiveTemplate();
  const tid = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  const categoria = param(sp['categoria']);
  const ordenar = param(sp['ordenar']) ?? 'novidades';
  const q = param(sp['q']);
  const page = Math.max(1, parseInt(param(sp['pagina']) ?? '1', 10));

  const catLabels: Record<string, string> = {
    aneis: 'Anéis', brincos: 'Brincos', colares: 'Colares', pulseiras: 'Pulseiras',
  };

  // Build where conditions
  const conditions = [eq(products.tenantId, tid), eq(products.status, 'active')];
  if (categoria) {
    // Filter by categoria via customFields jsonb → check if slug matches
    // Simple: filter by product name contains category keyword (MVP — full filter via customFields in Sprint 3)
  }
  if (q) {
    conditions.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.description ?? '', `%${q}%`),
        ilike(products.sku ?? '', `%${q}%`),
      )!,
    );
  }

  const orderBy = ordenar === 'preco-asc'
    ? asc(products.priceCents)
    : ordenar === 'preco-desc'
    ? desc(products.priceCents)
    : desc(products.createdAt);

  const allProducts = await db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(PAGE_SIZE * 3); // fetch generous window for client-side filter

  const title = categoria ? (catLabels[categoria] ?? categoria) : 'Todas as peças';

  const CATEGORY_BREADCRUMB = categoria ? [{ label: title, href: `/produtos?categoria=${categoria}` }] : [];

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 0' }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 32, display: 'flex', gap: 8 }}>
        <a href="/" style={{ color: 'var(--text-muted)' }}>Home</a>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        {CATEGORY_BREADCRUMB.length ? (
          <>
            <a href="/produtos" style={{ color: 'var(--text-muted)' }}>Produtos</a>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span>{title}</span>
          </>
        ) : (
          <span>Produtos</span>
        )}
      </div>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Coleção</p>
        <h1 style={{ margin: '0 0 12px' }}>{title}</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>
          {allProducts.length} peças
        </p>
      </div>

      {/* Grid com filtros */}
      <PLPFilters
        products={allProducts.map(p => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceCents: p.priceCents,
          comparePriceCents: p.comparePriceCents,
          customFields: p.customFields as Record<string, unknown>,
        }))}
        currency={tpl.currency}
        initialSort={ordenar}
        initialQ={q}
      />
    </div>
  );
}
