import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import {
  db,
  returnRequests,
  RETURN_STATUSES,
  canTransitionReturn,
  type ReturnStatus,
} from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

interface PatchBody {
  status?: string;
  resolutionNotes?: string;
  refundCents?: number | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  try {
    await requirePermission(session, 'orders', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;

  const [existing] = await db
    .select()
    .from(returnRequests)
    .where(and(eq(returnRequests.id, id), eq(returnRequests.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  let newStatus: ReturnStatus | undefined;

  if (body.status !== undefined) {
    if (!(RETURN_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: `status inválido (use ${RETURN_STATUSES.join(' | ')})` }, { status: 400 });
    }
    if (body.status !== existing.status) {
      if (!canTransitionReturn(existing.status, body.status)) {
        return NextResponse.json(
          { error: `Transição ${existing.status} → ${body.status} não permitida` },
          { status: 422 },
        );
      }
      newStatus = body.status as ReturnStatus;
      updates.status = newStatus;

      const now = new Date();
      if (newStatus === 'approved') updates.approvedAt = now;
      if (newStatus === 'rejected') updates.rejectedAt = now;
      if (newStatus === 'received') updates.receivedAt = now;
      if (newStatus === 'finalized') updates.finalizedAt = now;
    }
  }

  if (body.resolutionNotes !== undefined) {
    updates.resolutionNotes = body.resolutionNotes ? String(body.resolutionNotes).slice(0, 4000) : null;
  }

  if (body.refundCents !== undefined) {
    if (body.refundCents === null) {
      updates.refundCents = null;
    } else {
      const n = Number(body.refundCents);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: 'refundCents inválido' }, { status: 400 });
      }
      updates.refundCents = n;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ return: existing });
  }

  updates.updatedAt = new Date();

  try {
    const [updated] = await db
      .update(returnRequests)
      .set(updates)
      .where(and(eq(returnRequests.id, id), eq(returnRequests.tenantId, TENANT_ID)))
      .returning();

    await recordAuditLog({
      session,
      action: newStatus ? 'return.status_change' : 'return.update',
      entityType: 'return_request',
      entityId: id,
      before: { status: existing.status, refundCents: existing.refundCents },
      after: {
        status: updated?.status ?? existing.status,
        refundCents: updated?.refundCents ?? existing.refundCents,
      },
      metadata: { resolutionNotes: body.resolutionNotes ?? null },
    });

    return NextResponse.json({ return: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
