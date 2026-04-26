import type { Metadata } from 'next';
import Link from 'next/link';
import { db, collections } from '@lojeo/db';
import { eq } from 'drizzle-orm';

export const metadata: Metadata = { title: 'Coleções — Atelier' };
export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Fallback estático para quando DB não retornar coleções
const STATIC_CATEGORIES = [
  { slug: 'aneis', name: 'Anéis', desc: 'Solitários, eternidades e bandas.' },
  { slug: 'brincos', name: 'Brincos', desc: 'Argolas, ear cuffs e gotas.' },
  { slug: 'colares', name: 'Colares', desc: 'Pingentes e correntes finas.' },
  { slug: 'pulseiras', name: 'Pulseiras', desc: 'Delicadas e empilháveis.' },
];

export default async function ColecoesPage() {
  let dbCollections: { id: string; name: string; slug: string; description: string | null }[] = [];
  try {
    dbCollections = await db
      .select({ id: collections.id, name: collections.name, slug: collections.slug, description: collections.description })
      .from(collections)
      .where(eq(collections.tenantId, tenantId()))
      .limit(24);
  } catch { /* DB unavailable — use static fallback */ }

  const hasDbCollections = dbCollections.length > 0;

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '64px var(--container-pad) 120px' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Joalheria</p>
      <h1 style={{ marginBottom: 48 }}>Coleções</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
        {hasDbCollections
          ? dbCollections.map(col => (
              <Link
                key={col.id}
                href={`/produtos?colecao=${col.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  border: '1px solid var(--divider)', borderRadius: 8, padding: '28px 24px',
                  background: 'var(--surface)', transition: 'box-shadow 150ms',
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{col.name}</h2>
                  {col.description && (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{col.description}</p>
                  )}
                </div>
              </Link>
            ))
          : STATIC_CATEGORIES.map(cat => (
              <Link
                key={cat.slug}
                href={`/produtos?categoria=${cat.slug}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  border: '1px solid var(--divider)', borderRadius: 8, padding: '28px 24px',
                  background: 'var(--surface)',
                }}>
                  <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{cat.name}</h2>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{cat.desc}</p>
                </div>
              </Link>
            ))
        }
      </div>
    </div>
  );
}
