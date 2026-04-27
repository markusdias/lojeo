import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, ticketAssignmentRules } from '@lojeo/db';
import { auth } from '../../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../../../lib/validate';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  keyword: z.string().trim().max(200).nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  active: z.boolean().optional(),
  userIds: z.array(z.string().uuid()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'tickets', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseOrError(req, patchSchema);
  if (parsed instanceof NextResponse) return parsed;

  const [existing] = await db.select()
    .from(ticketAssignmentRules)
    .where(and(eq(ticketAssignmentRules.id, id), eq(ticketAssignmentRules.tenantId, TENANT_ID)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.name !== undefined) updates.name = parsed.name;
  if (parsed.keyword !== undefined) updates.keyword = parsed.keyword;
  if (parsed.targetUserId !== undefined) updates.targetUserId = parsed.targetUserId;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.active !== undefined) updates.active = parsed.active;
  if (parsed.userIds !== undefined) {
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    updates.metadata = { ...meta, userIds: parsed.userIds };
  }

  const [updated] = await db.update(ticketAssignmentRules)
    .set(updates)
    .where(and(eq(ticketAssignmentRules.id, id), eq(ticketAssignmentRules.tenantId, TENANT_ID)))
    .returning();

  await recordAuditLog({
    session,
    action: 'ticket_rule.update',
    entityType: 'ticket_rule',
    entityId: id,
    before: existing,
    after: updated,
  });

  return NextResponse.json({ rule: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'tickets', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;
  const [existing] = await db.select()
    .from(ticketAssignmentRules)
    .where(and(eq(ticketAssignmentRules.id, id), eq(ticketAssignmentRules.tenantId, TENANT_ID)))
    .limit(1);
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await db.delete(ticketAssignmentRules)
    .where(and(eq(ticketAssignmentRules.id, id), eq(ticketAssignmentRules.tenantId, TENANT_ID)));

  await recordAuditLog({
    session,
    action: 'ticket_rule.delete',
    entityType: 'ticket_rule',
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
