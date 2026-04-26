import { NextResponse } from 'next/server';
import { db, restockNotifications } from '@lojeo/db';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function POST(req: Request) {
  try {
    const body = await req.json() as { productId?: string; variantId?: string; email?: string };

    if (!body.productId || !body.email) {
      return NextResponse.json({ error: 'productId e email obrigatórios' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    await db.insert(restockNotifications).values({
      tenantId: tenantId(),
      email: body.email,
      productId: body.productId,
      variantId: body.variantId ?? null,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/restock-notify]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
