import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getStorage } from '@lojeo/storage';
import { isValidImageUpload } from '@lojeo/engine';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';
import { checkRateLimit } from '../../../../lib/rate-limit';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const HERO_WIDTH = 1600;
const QUALITY = 82;

export async function POST(req: NextRequest) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const userId = session?.user?.id ?? 'anon';
  const rate = checkRateLimit({
    key: `blog-cover-upload:${userId}`,
    max: 30,
    windowMs: 15 * 60 * 1000,
  });
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterSec: rate.retryAfterSec },
      { status: 429 },
    );
  }

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
    return NextResponse.json(
      { error: 'file_too_large', maxBytes: MAX_BYTES },
      { status: 400 },
    );
  }

  if (!isValidImageUpload(rawBuffer)) {
    return NextResponse.json({ error: 'invalid_image_signature' }, { status: 400 });
  }

  let webpBuffer: Buffer;
  try {
    webpBuffer = await sharp(rawBuffer)
      .resize({ width: HERO_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'image_processing_failed' }, { status: 422 });
  }

  const storage = getStorage();
  const key = `tenants/${TENANT_ID}/blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const result = await storage.put(key, webpBuffer, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000, immutable',
  });

  await recordAuditLog({
    session,
    action: 'blog.cover_upload',
    entityType: 'blog_post',
    metadata: { key: result.key, sizeBytes: result.size },
  });

  return NextResponse.json({ ok: true, url: result.url, key: result.key, sizeBytes: result.size });
}
