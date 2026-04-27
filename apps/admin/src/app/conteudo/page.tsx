import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import { db, blogPosts } from '@lojeo/db';
import { TENANT_ID } from '../../lib/roles';
import { EmptyState } from '../../components/ui/empty-state';

export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function StatusPill({ status }: { status: string }) {
  const isPub = status === 'published';
  return (
    <span
      style={{
        fontSize: 'var(--text-caption)',
        fontWeight: 'var(--w-medium)',
        padding: '2px 10px',
        borderRadius: 'var(--radius-full)',
        background: isPub ? 'var(--success-50, #ECFDF5)' : 'var(--neutral-50)',
        color: isPub ? 'var(--success-700, #047857)' : 'var(--fg-secondary)',
      }}
    >
      {isPub ? 'Publicado' : 'Rascunho'}
    </span>
  );
}

export default async function ConteudoPage() {
  const posts = await db
    .select({
      id: blogPosts.id,
      slug: blogPosts.slug,
      title: blogPosts.title,
      status: blogPosts.status,
      authorName: blogPosts.authorName,
      publishedAt: blogPosts.publishedAt,
      updatedAt: blogPosts.updatedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.tenantId, TENANT_ID))
    .orderBy(desc(blogPosts.updatedAt));

  return (
    <main style={{ padding: 'var(--space-7)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>Conteúdo</h1>
          <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)' }}>
            Guias e artigos do blog público — IA ajuda a escrever; você revisa e publica.
          </p>
        </div>
        <Link href="/conteudo/novo" className="lj-btn-primary" style={{ textDecoration: 'none' }}>
          Novo post
        </Link>
      </header>

      {posts.length === 0 ? (
        <EmptyState
          title="Comece com um guia útil"
          description="Use a IA pra rascunhar um post a partir de um tópico, edite e publique. Conteúdo nativo melhora SEO e dá autoridade à marca."
          action={{ label: 'Rascunhar com IA', href: '/conteudo/novo' }}
        />
      ) : (
        <div className="lj-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-5)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Título</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Status</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Autor</th>
                <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-5)', fontWeight: 'var(--w-medium)', color: 'var(--fg-secondary)' }}>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-3) var(--space-5)' }}>
                    <Link
                      href={`/conteudo/${p.id}`}
                      style={{ color: 'var(--fg)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}
                    >
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-muted)', marginTop: 2 }}>/{p.slug}</div>
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}><StatusPill status={p.status} /></td>
                  <td style={{ padding: 'var(--space-3)', color: 'var(--fg-secondary)' }}>{p.authorName ?? '—'}</td>
                  <td style={{ padding: 'var(--space-3) var(--space-5)', color: 'var(--fg-secondary)' }}>
                    {fmtDate(p.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
