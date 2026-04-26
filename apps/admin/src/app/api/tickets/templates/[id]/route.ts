import { NextRequest, NextResponse } from 'next/server';
import { db, ticketTemplates } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json() as { name?: string; body?: string };
    const update: { name?: string; body?: string } = {};
    if (body.name?.trim()) update.name = body.name.trim();
    if (body.body?.trim()) update.body = body.body.trim();
    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }
    const [updated] = await db
      .update(ticketTemplates)
      .set(update)
      .where(and(eq(ticketTemplates.id, id), eq(ticketTemplates.tenantId, TENANT_ID)))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [deleted] = await db
      .delete(ticketTemplates)
      .where(and(eq(ticketTemplates.id, id), eq(ticketTemplates.tenantId, TENANT_ID)))
      .returning();
    if (!deleted) return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
