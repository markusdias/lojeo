import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, blogPosts, slugifyTitle } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../../lib/validate';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().trim().min(3).max(300).optional(),
  slug: z.string().trim().min(1).max(200).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  body: z.string().min(10).optional(),
  coverImageUrl: z.string().trim().url().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  authorName: z.string().trim().max(150).nullable().optional(),
});

async function findPost(id: string) {
  const [row] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.id, id), eq(blogPosts.tenantId, TENANT_ID)))
    .limit(1);
  return row ?? null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await ctx.params;
  const post = await findPost(id);
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await findPost(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const parsed = await parseOrError(req, patchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const patch: Partial<typeof blogPosts.$inferInsert> = { updatedAt: new Date() };
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.slug !== undefined) patch.slug = slugifyTitle(parsed.slug);
  if (parsed.excerpt !== undefined) patch.excerpt = parsed.excerpt;
  if (parsed.body !== undefined) patch.body = parsed.body;
  if (parsed.coverImageUrl !== undefined) patch.coverImageUrl = parsed.coverImageUrl;
  if (parsed.authorName !== undefined) patch.authorName = parsed.authorName;
  if (parsed.status !== undefined) {
    patch.status = parsed.status;
    if (parsed.status === 'published' && !existing.publishedAt) {
      patch.publishedAt = new Date();
    }
  }

  try {
    const [updated] = await db
      .update(blogPosts)
      .set(patch)
      .where(and(eq(blogPosts.id, id), eq(blogPosts.tenantId, TENANT_ID)))
      .returning();

    await recordAuditLog({
      session,
      action: 'blog.update',
      entityType: 'blog_post',
      entityId: id,
      before: { status: existing.status, slug: existing.slug, title: existing.title },
      after: { status: updated?.status, slug: updated?.slug, title: updated?.title },
    });

    return NextResponse.json({ post: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_blog_posts_tenant_slug') || msg.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: 'slug já em uso — escolha outro' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await findPost(id);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db.delete(blogPosts).where(and(eq(blogPosts.id, id), eq(blogPosts.tenantId, TENANT_ID)));

  await recordAuditLog({
    session,
    action: 'blog.delete',
    entityType: 'blog_post',
    entityId: id,
    before: { slug: existing.slug, title: existing.title, status: existing.status },
  });

  return NextResponse.json({ ok: true });
}
