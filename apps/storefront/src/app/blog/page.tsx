import Link from 'next/link';
import type { Metadata } from 'next';
import { eq, and, desc } from 'drizzle-orm';
import { db, blogPosts } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export const metadata: Metadata = {
  title: 'Blog · Joias — Atelier',
  description:
    'Guias e histórias sobre joalheria contemporânea — cuidados, materiais, simbologia e curadoria.',
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
}

export default async function BlogIndexPage() {
  const posts = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      coverImageUrl: blogPosts.coverImageUrl,
      authorName: blogPosts.authorName,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.tenantId, TENANT_ID), eq(blogPosts.status, 'published')))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(50);

  return (
    <article style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '64px var(--container-pad)' }}>
      <header style={{ textAlign: 'center', marginBottom: 64 }}>
        <p className="eyebrow" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>Diário</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
          Blog
        </h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '52ch', margin: '16px auto 0', fontSize: 16, lineHeight: 1.6 }}>
          Guias práticos, histórias do ateliê e o que aprendemos cuidando de joias todos os dias.
        </p>
      </header>

      {posts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '64px 0' }}>
          Em breve, primeiras histórias.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 48 }}>
          {posts.map((p) => (
            <li key={p.id} style={{ paddingBottom: 48, borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))' }}>
              <Link
                href={`/blog/${p.slug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: p.coverImageUrl ? '180px 1fr' : '1fr',
                  gap: 32,
                  textDecoration: 'none',
                  color: 'inherit',
                  alignItems: 'start',
                }}
              >
                {p.coverImageUrl && (
                  <img
                    src={p.coverImageUrl}
                    alt=""
                    width={180}
                    height={180}
                    loading="lazy"
                    decoding="async"
                    style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 'var(--img-radius, 8px)' }}
                  />
                )}
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
                    {formatDate(p.publishedAt)} {p.authorName ? `· ${p.authorName}` : ''}
                  </p>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', margin: '0 0 12px', lineHeight: 1.2 }}>
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.6, margin: 0 }}>{p.excerpt}</p>
                  )}
                  <p style={{ marginTop: 16, fontSize: 13, color: 'var(--accent)' }}>Ler →</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
