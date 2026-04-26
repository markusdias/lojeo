import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { eq, and, desc } from 'drizzle-orm';
import { db, ugcPosts } from '@lojeo/db';
import { getStorage } from '@lojeo/storage';
import { auth } from '../../../auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const TENANT_ID = process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

// Cliente lista próprios envios
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: ugcPosts.id,
      imageUrl: ugcPosts.imageUrl,
      thumbnailUrl: ugcPosts.thumbnailUrl,
      caption: ugcPosts.caption,
      status: ugcPosts.status,
      rejectionReason: ugcPosts.rejectionReason,
      createdAt: ugcPosts.createdAt,
      approvedAt: ugcPosts.approvedAt,
    })
    .from(ugcPosts)
    .where(and(eq(ugcPosts.tenantId, TENANT_ID), eq(ugcPosts.userId, userId)))
    .orderBy(desc(ugcPosts.createdAt))
    .limit(50);

  return NextResponse.json({ posts: rows });
}

// Cliente envia foto
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const file = formData.get('file');
  const caption = String(formData.get('caption') ?? '').slice(0, 500);

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  if (rawBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 400 });
  }

  // Validate it's actually an image (sharp throws on non-image)
  let webpFull: Buffer;
  let webpThumb: Buffer;
  try {
    const base = sharp(rawBuffer).rotate(); // honor EXIF orientation
    webpFull = await base.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    webpThumb = await base.clone().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  }

  const storage = getStorage();
  const baseKey = `tenants/${TENANT_ID}/ugc/${userId}/${Date.now()}`;

  const fullResult = await storage.put(`${baseKey}/full.webp`, webpFull, { contentType: 'image/webp' });
  const thumbResult = await storage.put(`${baseKey}/thumb.webp`, webpThumb, { contentType: 'image/webp' });

  const [created] = await db.insert(ugcPosts).values({
    tenantId: TENANT_ID,
    userId,
    customerEmail: session?.user?.email ?? null,
    customerName: session?.user?.name ?? null,
    imageUrl: fullResult.url,
    thumbnailUrl: thumbResult.url,
    caption: caption || null,
    status: 'pending', // entra direto para fila manual; moderação automática quando ANTHROPIC_API_KEY estiver em prod
    source: 'direct_upload',
  }).returning();

  return NextResponse.json(created, { status: 201 });
}
