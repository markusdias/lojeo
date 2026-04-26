import { NextRequest, NextResponse } from 'next/server';
import { db, ticketTemplates } from '@lojeo/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(ticketTemplates)
      .where(eq(ticketTemplates.tenantId, TENANT_ID))
      .orderBy(ticketTemplates.createdAt);
    return NextResponse.json(rows);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { name?: string; body?: string };
    if (!body.name?.trim() || !body.body?.trim()) {
      return NextResponse.json({ error: 'name e body obrigatórios' }, { status: 400 });
    }
    const [created] = await db
      .insert(ticketTemplates)
      .values({ tenantId: TENANT_ID, name: body.name.trim(), body: body.body.trim() })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
