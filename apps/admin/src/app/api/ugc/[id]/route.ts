import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, ugcPosts } from '@lojeo/db';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const VALID_STATUSES = ['pending', 'approved', 'rejected', 'moderating'] as const;
type Status = typeof VALID_STATUSES[number];

interface PatchBody {
  status?: Status;
  rejectionReason?: string;
  productsTagged?: Array<{ productId: string; x: number; y: number; label?: string }>;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: PatchBody;
  try {
    body = await req.json() as PatchBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  const now = new Date();

  if (body.status) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
    }
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

  if (body.productsTagged) {
    if (!Array.isArray(body.productsTagged)) {
      return NextResponse.json({ error: 'productsTagged must be array' }, { status: 400 });
    }
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
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [deleted] = await db
    .delete(ugcPosts)
    .where(and(eq(ugcPosts.id, id), eq(ugcPosts.tenantId, TENANT_ID)))
    .returning();
  if (!deleted) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
