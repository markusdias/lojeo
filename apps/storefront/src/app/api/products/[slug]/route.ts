import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, products, productVariants, productImages } from '@lojeo/db';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenantId = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

  const product = await db.query.products.findFirst({
    where: and(
      eq(products.tenantId, tenantId),
      eq(products.slug, slug),
      eq(products.status, 'active'),
    ),
  });
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [variants, images] = await Promise.all([
    db.select().from(productVariants).where(eq(productVariants.productId, product.id)),
    db.select().from(productImages).where(eq(productImages.productId, product.id)),
  ]);

  return NextResponse.json({ product, variants, images });
}
