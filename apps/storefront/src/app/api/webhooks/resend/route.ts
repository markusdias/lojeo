import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lojeo/logger';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

function verifySignature(req: NextRequest, body: string): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return true;
  const svixId = req.headers.get('svix-id') ?? '';
  const svixTs = req.headers.get('svix-timestamp') ?? '';
  const svixSig = req.headers.get('svix-signature') ?? '';
  if (!svixId || !svixTs || !svixSig) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const toSign = `${svixId}.${svixTs}.${body}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');
  const sigs = svixSig.split(' ').map(s => s.split(',')[1]).filter(Boolean);
  return sigs.includes(expected);
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!verifySignature(req, rawBody)) {
    logger.warn({ provider: 'resend' }, 'webhook signature invalid');
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }
  let body: { type?: string; data?: { email_id?: string; to?: string } } = {};
  try { body = JSON.parse(rawBody); } catch { /* */ }
  logger.info({
    provider: 'resend',
    event: body.type,
    emailId: body.data?.email_id,
    to: body.data?.to,
  }, 'webhook received (stub)');
  return NextResponse.json({ ok: true });
}
