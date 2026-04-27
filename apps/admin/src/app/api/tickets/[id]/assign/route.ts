import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, supportTickets } from '@lojeo/db';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../../../lib/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  userId: z.string().uuid('userId inválido').nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'tickets', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseOrError(req, schema);
  if (parsed instanceof NextResponse) return parsed;

  const [existing] = await db.select()
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID), eq(supportTickets.id, id)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db.update(supportTickets)
    .set({ assignedToUserId: parsed.userId, updatedAt: new Date() })
    .where(and(eq(supportTickets.tenantId, TENANT_ID), eq(supportTickets.id, id)));

  await recordAuditLog({
    session,
    action: 'ticket.assigned',
    entityType: 'ticket',
    entityId: id,
    before: { assignedToUserId: existing.assignedToUserId },
    after: { assignedToUserId: parsed.userId },
  });

  return NextResponse.json({ ok: true });
}
