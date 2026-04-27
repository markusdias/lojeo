import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, blogPosts, slugifyTitle, BLOG_POST_STATUSES } from '@lojeo/db';
import { auth } from '../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../lib/validate';

export const dynamic = 'force-dynamic';

const STATUS_VALUES = BLOG_POST_STATUSES as readonly string[];

const createSchema = z.object({
  title: z.string().trim().min(3, 'title obrigatório').max(300),
  slug: z.string().trim().min(1).max(200).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  body: z.string().min(10, 'body obrigatório'),
  coverImageUrl: z.string().trim().url().nullable().optional(),
  status: z.enum(['draft', 'published']).optional(),
  authorName: z.string().trim().max(150).nullable().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const filters = [eq(blogPosts.tenantId, TENANT_ID)];
  if (status && STATUS_VALUES.includes(status)) {
    filters.push(eq(blogPosts.status, status));
  }

  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(...filters))
    .orderBy(desc(blogPosts.updatedAt));

  return NextResponse.json({ posts: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const parsed = await parseOrError(req, createSchema);
  if (parsed instanceof NextResponse) return parsed;

  const slug = parsed.slug?.trim() ? slugifyTitle(parsed.slug) : slugifyTitle(parsed.title);
  const status = parsed.status ?? 'draft';
  const publishedAt = status === 'published' ? new Date() : null;

  try {
    const [created] = await db.insert(blogPosts).values({
      tenantId: TENANT_ID,
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt ?? null,
      body: parsed.body,
      coverImageUrl: parsed.coverImageUrl ?? null,
      status,
      authorName: parsed.authorName ?? session?.user?.name ?? null,
      publishedAt,
    }).returning();

    await recordAuditLog({
      session,
      action: 'blog.create',
      entityType: 'blog_post',
      entityId: created?.id ?? null,
      after: { slug, title: parsed.title, status },
    });

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('uniq_blog_posts_tenant_slug') || msg.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: 'slug já em uso — escolha outro' }, { status: 409 });
    }
    throw err;
  }
}
