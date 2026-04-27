import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { eq, and } from 'drizzle-orm';
import { db, blogPosts } from '@lojeo/db';
import { renderMarkdown } from '@lojeo/engine';
import { ArticleBody } from './article-body';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';
const BASE_URL = process.env.STOREFRONT_URL ?? 'https://joias.lojeo.com.br';

interface Params {
  params: Promise<{ slug: string }>;
}

async function findPost(slug: string) {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.tenantId, TENANT_ID), eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) return { title: 'Post nao encontrado' };
  return {
    title: `${post.title} - Blog`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: 'article',
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
    },
  };
}

function fmt(d: Date | null | undefined): string {
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(d);
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) notFound();

  const html = renderMarkdown(post.body);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString() ?? undefined,
    dateModified: post.updatedAt?.toISOString() ?? undefined,
    author: post.authorName ? { '@type': 'Person', name: post.authorName } : undefined,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/blog/${post.slug}` },
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${BASE_URL}/blog/${post.slug}` },
    ],
  };

  return (
    <article style={{ maxWidth: 720, margin: '0 auto', padding: '48px var(--container-pad) 96px' }}>
      <ArticleBody articleJsonLd={articleSchema} breadcrumbJsonLd={breadcrumbSchema} bodyHtml={html}>
        <nav aria-label="Navegacao" style={{ marginBottom: 32, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link href="/" style={{ color: 'inherit' }}>Inicio</Link>
          {' / '}
          <Link href="/blog" style={{ color: 'inherit' }}>Blog</Link>
        </nav>

        <header style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
            {fmt(post.publishedAt)} {post.authorName ? `- ${post.authorName}` : ''}
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, margin: '0 0 16px' }}>
            {post.title}
          </h1>
          {post.excerpt && (
            <p style={{ color: 'var(--text-muted)', fontSize: 18, lineHeight: 1.6, margin: 0 }}>{post.excerpt}</p>
          )}
        </header>

        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={`Capa do post: ${post.title}`}
            loading="eager"
            decoding="async"
            style={{ width: '100%', height: 'auto', borderRadius: 'var(--img-radius, 8px)', marginBottom: 48 }}
          />
        )}
      </ArticleBody>

      <footer style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--border, rgba(0,0,0,0.08))', textAlign: 'center' }}>
        <Link
          href="/blog"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            border: '1px solid var(--border, rgba(0,0,0,0.16))',
            borderRadius: 'var(--radius-full, 999px)',
            color: 'var(--fg, #1A1A1A)',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          - Mais historias
        </Link>
      </footer>
    </article>
  );
}
