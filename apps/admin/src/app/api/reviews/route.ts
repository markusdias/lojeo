import { NextResponse } from 'next/server';
import { db, productReviews } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '../../../auth';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'pending';
  const tid = tenantId();

  const rows = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.tenantId, tid), eq(productReviews.status, status)))
    .orderBy(desc(productReviews.createdAt))
    .limit(100);

  return NextResponse.json(rows);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json() as { id?: string; status?: string; adminResponse?: string };
  if (!body.id || !body.status) {
    return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 });
  }
  if (!['approved', 'rejected'].includes(body.status)) {
    return NextResponse.json({ error: 'status inválido' }, { status: 422 });
  }

  await db.update(productReviews).set({
    status: body.status,
    adminResponse: body.adminResponse ?? null,
    updatedAt: new Date(),
  }).where(and(eq(productReviews.tenantId, tenantId()), eq(productReviews.id, body.id)));

  return NextResponse.json({ ok: true });
}
