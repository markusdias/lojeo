import { NextResponse } from 'next/server';
import { db, ticketMessages, supportTickets } from '@lojeo/db';
import { eq, and, asc } from 'drizzle-orm';
import { auth } from '../../../../../auth';
import { recordAuditLog } from '../../../../../lib/roles';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  // Verify ticket belongs to tenant
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID()), eq(supportTickets.id, id)))
    .limit(1);

  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });

  const messages = await db
    .select()
    .from(ticketMessages)
    .where(eq(ticketMessages.ticketId, id))
    .orderBy(asc(ticketMessages.createdAt));

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as { body?: string; isInternal?: boolean };

  if (!body.body?.trim()) {
    return NextResponse.json({ error: 'body obrigatório' }, { status: 400 });
  }

  // Verify ticket belongs to tenant
  const [ticket] = await db
    .select({ id: supportTickets.id })
    .from(supportTickets)
    .where(and(eq(supportTickets.tenantId, TENANT_ID()), eq(supportTickets.id, id)))
    .limit(1);

  if (!ticket) return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });

  const [msg] = await db.insert(ticketMessages).values({
    ticketId: id,
    userId: session.user?.id ?? null,
    senderType: 'admin',
    body: body.body.trim(),
    isInternal: body.isInternal ?? false,
  }).returning();

  // Auto-update ticket status to in_progress when admin replies
  if (!body.isInternal) {
    await db
      .update(supportTickets)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(and(
        eq(supportTickets.tenantId, TENANT_ID()),
        eq(supportTickets.id, id),
        eq(supportTickets.status, 'open'),
      ));
  }

  // Audit log — distingue resposta pública vs nota interna
  await recordAuditLog({
    session,
    action: body.isInternal ? 'ticket.note_added' : 'ticket.reply_sent',
    entityType: 'ticket',
    entityId: id,
    after: { messageId: msg?.id, isInternal: body.isInternal ?? false, length: body.body.trim().length },
  });

  return NextResponse.json({ message: msg }, { status: 201 });
}
