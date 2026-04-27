import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, productReviews, emitSellerNotification } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import { checkRateLimit, getClientIp } from '../../../lib/rate-limit';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const ReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(2000).optional(),
  name: z.string().min(1).max(100),
  email: z.string().email().max(300).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('productId');
  if (!productId) return NextResponse.json({ error: 'productId obrigatório' }, { status: 400 });

  try {
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
  } catch {
    return NextResponse.json({ reviews: [], avg: 0, total: 0 });
  }
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ReviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_payload', issues: parsed.error.issues }, { status: 400 });
  }

  const ip = getClientIp(req);
  const emailKey = parsed.data.email?.toLowerCase() ?? ip;
  const rl = checkRateLimit({
    key: `review:${emailKey}:${ip}`,
    max: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }

  try {
    const tid = tenantId();
    const inserted = await db.insert(productReviews).values({
      tenantId: tid,
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
      anonymousName: parsed.data.name.trim(),
      anonymousEmail: parsed.data.email ?? null,
      status: 'pending',
      verifiedPurchase: false,
    }).returning({ id: productReviews.id });

    const reviewId = inserted[0]?.id;
    if (reviewId) {
      void emitSellerNotification({
        tenantId: tid,
        type: 'review.pending',
        severity: 'info',
        title: `Nova avaliação ${parsed.data.rating}/5`,
        body: `${parsed.data.name.trim()}${parsed.data.title ? ` · ${parsed.data.title}` : ''}`,
        link: '/avaliacoes',
        entityType: 'product_review',
        entityId: reviewId,
        metadata: { rating: parsed.data.rating, productId: parsed.data.productId },
      });
    }

    return NextResponse.json({ ok: true, message: 'Avaliação enviada para moderação' }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/reviews]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
