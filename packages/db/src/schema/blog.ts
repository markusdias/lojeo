import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Blog posts (Sprint 12 — conteudo nativo SEO) ─────────────────────────────
//
// status:
//   'draft'      → rascunho, oculto do storefront
//   'published'  → visivel em /blog e /blog/[slug]
//
// body: markdown (renderizado server-side em /blog/[slug])
// publishedAt: setado quando status muda para 'published'; usado para ORDER BY
// (tenantId, slug) e unico — slug e a URL publica

export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 200 }).notNull(),
    title: varchar('title', { length: 300 }).notNull(),
    excerpt: text('excerpt'),
    body: text('body').notNull(),
    coverImageUrl: text('cover_image_url'),
    status: varchar('status', { length: 20 }).default('draft').notNull(),
    authorName: varchar('author_name', { length: 150 }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('uniq_blog_posts_tenant_slug').on(t.tenantId, t.slug),
    index('idx_blog_posts_tenant_status_published').on(t.tenantId, t.status, t.publishedAt),
    index('idx_blog_posts_tenant_published').on(t.tenantId, t.publishedAt),
  ],
);

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;

export type BlogPostStatus = 'draft' | 'published';

export const BLOG_POST_STATUSES: readonly BlogPostStatus[] = ['draft', 'published'] as const;

/**
 * Slugify utilitario — usa NFD para remover acentos, lowercase, troca nao-alfa por hifen.
 * Restringe a [a-z0-9-], 1..200 chars. Coalesce hifens duplicados.
 */
export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'post';
}
