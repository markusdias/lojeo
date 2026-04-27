import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db, blogPosts } from '@lojeo/db';
import { TENANT_ID } from '../../../lib/roles';
import { EditPostForm } from './edit-form';

export const dynamic = 'force-dynamic';

interface Params {
  params: Promise<{ id: string }>;
}

export default async function EditarPostPage({ params }: Params) {
  const { id } = await params;
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, id), eq(blogPosts.tenantId, TENANT_ID)))
    .limit(1);

  if (!post) notFound();

  return (
    <main style={{ padding: 'var(--space-7)', maxWidth: 980, margin: '0 auto' }}>
      <header style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>Editar post</h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)' }}>
          /{post.slug} · {post.status === 'published' ? 'publicado' : 'rascunho'}
        </p>
      </header>
      <EditPostForm post={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt ?? '',
        body: post.body,
        coverImageUrl: post.coverImageUrl ?? '',
        status: post.status as 'draft' | 'published',
      }} />
    </main>
  );
}
