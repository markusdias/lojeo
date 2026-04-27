import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db, ticketAssignmentRules } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';
import { z } from 'zod';
import { parseOrError } from '../../../../lib/validate';

export const dynamic = 'force-dynamic';

const ruleTypeSchema = z.enum(['keyword', 'round_robin']);

const createSchema = z.object({
  name: z.string().trim().min(1, 'name obrigatório').max(200),
  ruleType: ruleTypeSchema,
  keyword: z.string().trim().max(200).nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(100),
  active: z.boolean().default(true),
  userIds: z.array(z.string().uuid()).optional(), // só usado por round_robin
}).superRefine((data, ctx) => {
  if (data.ruleType === 'keyword') {
    if (!data.keyword || data.keyword.trim().length < 1) {
      ctx.addIssue({ code: 'custom', path: ['keyword'], message: 'keyword obrigatória para ruleType=keyword' });
    }
    if (!data.targetUserId) {
      ctx.addIssue({ code: 'custom', path: ['targetUserId'], message: 'targetUserId obrigatório para ruleType=keyword' });
    }
  }
  if (data.ruleType === 'round_robin') {
    const hasMembers = (data.userIds && data.userIds.length > 0) || !!data.targetUserId;
    if (!hasMembers) {
      ctx.addIssue({ code: 'custom', path: ['userIds'], message: 'round_robin precisa de userIds[] ou targetUserId' });
    }
  }
});

export async function GET() {
  const session = await auth();
  try {
    await requirePermission(session, 'tickets', 'read');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const rows = await db.select()
    .from(ticketAssignmentRules)
    .where(eq(ticketAssignmentRules.tenantId, TENANT_ID))
    .orderBy(asc(ticketAssignmentRules.priority));

  return NextResponse.json({ rules: rows });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'tickets', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const parsed = await parseOrError(req, createSchema);
  if (parsed instanceof NextResponse) return parsed;

  const metadata: Record<string, unknown> = {};
  if (parsed.ruleType === 'round_robin' && parsed.userIds && parsed.userIds.length > 0) {
    metadata.userIds = parsed.userIds;
  }

  const [created] = await db.insert(ticketAssignmentRules).values({
    tenantId: TENANT_ID,
    name: parsed.name,
    ruleType: parsed.ruleType,
    keyword: parsed.keyword ?? null,
    targetUserId: parsed.targetUserId ?? null,
    priority: parsed.priority,
    active: parsed.active,
    metadata,
  }).returning();

  await recordAuditLog({
    session,
    action: 'ticket_rule.create',
    entityType: 'ticket_rule',
    entityId: created?.id ?? null,
    after: created,
  });

  return NextResponse.json({ rule: created }, { status: 201 });
}
