import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import sharp from 'sharp';
import { db, productImages, products } from '@lojeo/db';
import { getStorage } from '@lojeo/storage';
import { ai } from '@lojeo/ai';

const SIZES = [
  { suffix: 'sm', width: 200 },
  { suffix: 'md', width: 600 },
  { suffix: 'lg', width: 1200 },
] as const;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const tid = tenantId(req);

  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.tenantId, tid)),
  });
  if (!product) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  if (rawBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 400 });
  }

  const storage = getStorage();
  const baseKey = `tenants/${tid}/products/${productId}/${Date.now()}`;

  const sharpBase = sharp(rawBuffer);
  const meta = await sharpBase.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Full-size WebP
  const fullWebp = await sharp(rawBuffer).webp({ quality: 85 }).toBuffer();
  const fullResult = await storage.put(`${baseKey}/original.webp`, fullWebp, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });

  // Thumbnails
  const thumbnails: Record<string, string> = {};
  for (const size of SIZES) {
    const buf = await sharp(rawBuffer)
      .resize({ width: size.width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const result = await storage.put(`${baseKey}/${size.suffix}.webp`, buf, {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    thumbnails[size.suffix] = result.url;
  }

  // Alt text via AI (mock in dev, real in prod)
  let altText: string | null = null;
  try {
    const { text } = await ai({
      feature: 'image_alt_text',
      tenantId: tid,
      tier: 'haiku',
      messages: [
        {
          role: 'user',
          content: `Produto: "${product.name}". Gere um alt text descritivo em português para esta imagem de produto. Máximo 120 caracteres. Responda somente o alt text, sem aspas.`,
        },
      ],
      maxTokens: 60,
      cacheTtlSec: 0,
    });
    altText = text.trim().slice(0, 120) || null;
  } catch {
    // degraded — sem alt text
  }

  const position = parseInt(formData.get('position')?.toString() ?? '0', 10) || 0;

  const [row] = await db
    .insert(productImages)
    .values({
      tenantId: tid,
      productId,
      url: fullResult.url,
      altText,
      position,
      width,
      height,
    })
    .returning();

  return NextResponse.json({ image: row, thumbnails }, { status: 201 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = await params;
  const tid = tenantId(req);

  const rows = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.productId, productId), eq(productImages.tenantId, tid)));

  return NextResponse.json({ images: rows });
}
