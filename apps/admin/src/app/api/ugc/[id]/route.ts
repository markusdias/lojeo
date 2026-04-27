import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, ugcPosts } from '@lojeo/db';
import { auth } from '../../../../auth';
import { recordAuditLog, requirePermission } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'moderating'] as const;

const TaggedProductSchema = z.object({
  productId: z.string().uuid(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  label: z.string().max(200).optional(),
});

const PatchSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  rejectionReason: z.string().max(500).optional(),
  productsTagged: z.array(TaggedProductSchema).max(20).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'ugc', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;
  const [row] = await db
    .select()
    .from(ugcPosts)
    .where(and(eq(ugcPosts.id, id), eq(ugcPosts.tenantId, TENANT_ID)))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'ugc', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;

  const update: Record<string, unknown> = {};
  const now = new Date();

  if (body.status) {
    update['status'] = body.status;
    update['moderatedAt'] = now;
    if (body.status === 'approved') {
      update['approvedAt'] = now;
      update['rejectionReason'] = null;
    }
    if (body.status === 'rejected') {
      update['approvedAt'] = null;
      update['rejectionReason'] = body.rejectionReason ?? 'Conteúdo não atende às diretrizes da loja';
    }
  }

  if (body.productsTagged !== undefined) {
    update['productsTagged'] = body.productsTagged;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 });
  }

  const [updated] = await db
    .update(ugcPosts)
    .set(update)
    .where(and(eq(ugcPosts.id, id), eq(ugcPosts.tenantId, TENANT_ID)))
    .returning();

  if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const isTagsOnly = body.productsTagged !== undefined && !body.status;
  const action = isTagsOnly
    ? 'ugc.tags_updated'
    : body.status === 'approved'
      ? 'ugc.approve'
      : body.status === 'rejected'
        ? 'ugc.reject'
        : 'ugc.update';

  await recordAuditLog({
    session,
    action,
    entityType: 'ugc_post',
    entityId: id,
    after: {
      status: body.status,
      productsTagged: body.productsTagged,
      rejectionReason: body.rejectionReason,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'ugc', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }
  const { id } = await params;
  const [deleted] = await db
    .delete(ugcPosts)
    .where(and(eq(ugcPosts.id, id), eq(ugcPosts.tenantId, TENANT_ID)))
    .returning();
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await recordAuditLog({
    session,
    action: 'ugc.delete',
    entityType: 'ugc_post',
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
