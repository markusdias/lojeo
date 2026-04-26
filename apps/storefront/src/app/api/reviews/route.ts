import { NextResponse } from 'next/server';
import { db, productReviews } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 });

  const reviews = await db
    .select()
    .from(productReviews)
    .where(and(
      eq(productReviews.tenantId, tenantId()),
      eq(productReviews.productId, productId),
      eq(productReviews.status, 'approved'),
    ))
    .orderBy(desc(productReviews.createdAt))
    .limit(50);

  const avg = reviews.length > 0
    ? reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length
    : 0;

  return NextResponse.json({ reviews, avg: Math.round(avg * 10) / 10, total: reviews.length });
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      productId?: string;
      rating?: number;
      title?: string;
      body?: string;
      name?: string;
      email?: string;
    };

    if (!body.productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 });
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'rating deve ser entre 1 e 5' }, { status: 400 });
    }
    if (!body.name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    await db.insert(productReviews).values({
      tenantId: tenantId(),
      productId: body.productId,
      rating: body.rating,
      title: body.title?.slice(0, 200) ?? null,
      body: body.body?.slice(0, 2000) ?? null,
      anonymousName: body.name.trim().slice(0, 100),
      anonymousEmail: body.email?.slice(0, 300) ?? null,
      status: 'pending',
      verifiedPurchase: false,
    });

    return NextResponse.json({ ok: true, message: 'Avaliação enviada para moderação' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reviews]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
