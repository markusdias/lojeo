import { NextResponse } from 'next/server';
import { db, supportTickets } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '../../../auth';
import { applyAutoAssignment } from '../../../lib/ticket-assignment';

export const dynamic = 'force-dynamic';

const TENANT_ID = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const tid = TENANT_ID();

  const conditions = [eq(supportTickets.tenantId, tid)];
  if (status) conditions.push(eq(supportTickets.status, status));
  if (priority) conditions.push(eq(supportTickets.priority, priority));

  const rows = await db
    .select()
    .from(supportTickets)
    .where(and(...conditions))
    .orderBy(desc(supportTickets.createdAt))
    .limit(200);

  return NextResponse.json({ tickets: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json() as {
    subject?: string;
    customerName?: string;
    customerEmail?: string;
    priority?: string;
    orderId?: string;
    userId?: string;
    source?: string;
  };

  if (!body.subject?.trim() || !body.customerName?.trim() || !body.customerEmail?.trim()) {
    return NextResponse.json({ error: 'subject, customerName e customerEmail obrigatórios' }, { status: 400 });
  }

  const tid = TENANT_ID();
  const slaHours = 24;
  const slaDeadlineAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  const [ticket] = await db.insert(supportTickets).values({
    tenantId: tid,
    subject: body.subject.trim(),
    customerName: body.customerName.trim(),
    customerEmail: body.customerEmail.trim(),
    priority: (body.priority as 'low' | 'medium' | 'high' | 'urgent') ?? 'medium',
    orderId: body.orderId ?? null,
    userId: body.userId ?? null,
    source: (body.source as 'web' | 'email' | 'whatsapp' | 'bot') ?? 'web',
    slaHours,
    slaDeadlineAt,
  }).returning();

  // Sprint 9 — auto-assignment via regras configuráveis. Falha aqui não derruba criação.
  let assignedToUserId: string | null = null;
  if (ticket?.id) {
    assignedToUserId = await applyAutoAssignment(ticket.id, ticket.subject, '');
  }

  return NextResponse.json({
    ticket: assignedToUserId ? { ...ticket, assignedToUserId } : ticket,
  }, { status: 201 });
}
