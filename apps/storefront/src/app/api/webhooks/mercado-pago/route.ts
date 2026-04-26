import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lojeo/logger';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function verifySignature(req: NextRequest, _body: string): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret = aceitar (dev)
  const xSignature = req.headers.get('x-signature') ?? '';
  const xRequestId = req.headers.get('x-request-id') ?? '';
  const ts = xSignature.match(/ts=(\d+)/)?.[1];
  const v1 = xSignature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!ts || !v1) return false;
  const url = new URL(req.url);
  const dataId = url.searchParams.get('data.id') ?? '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hmac = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return hmac === v1;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let body: { type?: string; data?: { id?: string }; action?: string } = {};
  try { body = JSON.parse(rawBody); } catch { /* */ }
  if (!verifySignature(req, rawBody)) {
    logger.warn({ provider: 'mercado-pago' }, 'webhook signature invalid');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  logger.info({ provider: 'mercado-pago', type: body.type, action: body.action, dataId: body.data?.id }, 'webhook received (stub)');
  return NextResponse.json({ ok: true, received: true, processed: false });
}
