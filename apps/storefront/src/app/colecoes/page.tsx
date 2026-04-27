import type { Metadata } from 'next';
import { db, collections, productCollections, products } from '@lojeo/db';
import { eq, sql } from 'drizzle-orm';
import { ColecoesGrid } from './_components/colecoes-grid';

export const metadata: Metadata = { title: 'Coleções — Atelier' };
export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

interface ColecoesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

interface CollectionListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  href?: string;
}

// Fallback estático: aponta para /produtos?categoria=<slug> já que essas são
// categorias (não coleções persistidas) — preserva semântica e evita 404.
const STATIC_COLLECTIONS: CollectionListItem[] = [
  { id: 'aneis', slug: 'aneis', name: 'Anéis', description: 'Solitários, eternidades e bandas finalizadas à mão.', productCount: 0, href: '/produtos?categoria=aneis' },
  { id: 'brincos', slug: 'brincos', name: 'Brincos', description: 'Argolas, ear cuffs e gotas em ouro 18k.', productCount: 0, href: '/produtos?categoria=brincos' },
  { id: 'colares', slug: 'colares', name: 'Colares', description: 'Pingentes e correntes para uso diário.', productCount: 0, href: '/produtos?categoria=colares' },
  { id: 'pulseiras', slug: 'pulseiras', name: 'Pulseiras', description: 'Delicadas e empilháveis.', productCount: 0, href: '/produtos?categoria=pulseiras' },
];

export default async function ColecoesPage({ searchParams }: ColecoesPageProps) {
  const sp = await searchParams;
  const ordenar = param(sp['ordenar']) ?? 'recentes';

  let items: CollectionListItem[] = [];
  let usingFallback = false;

  try {
    const rows = await db
      .select({
        id: collections.id,
        slug: collections.slug,
        name: collections.name,
        description: collections.description,
        productCount: sql<number>`count(distinct ${productCollections.productId})::int`,
      })
      .from(collections)
      .leftJoin(productCollections, eq(productCollections.collectionId, collections.id))
      .leftJoin(
        products,
        sql`${products.id} = ${productCollections.productId} and ${products.status} = 'active'`,
      )
      .where(eq(collections.tenantId, tenantId()))
      .groupBy(collections.id)
      .limit(48);

    items = rows.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      productCount: Number(r.productCount ?? 0),
    }));
  } catch {
    /* DB indisponível — fallback estático */
  }

  if (items.length === 0) {
    items = STATIC_COLLECTIONS;
    usingFallback = true;
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 0' }}>
      {/* Breadcrumbs */}
      <nav
        aria-label="Trilha de navegação"
        style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 32, display: 'flex', gap: 8 }}
      >
        <a href="/" style={{ color: 'var(--text-muted)' }}>Home</a>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>Coleções</span>
      </nav>

      {/* Header — eyebrow + H1 + contagem (mesmo idioma do PLP) */}
      <div style={{ marginBottom: 40 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Joalheria</p>
        <h1 style={{ margin: '0 0 12px' }}>Coleções</h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', margin: 0 }}>
          {items.length} {items.length === 1 ? 'coleção curada' : 'coleções curadas'}
        </p>
      </div>

      <ColecoesGrid items={items} initialSort={ordenar} usingFallback={usingFallback} />
    </div>
  );
}
