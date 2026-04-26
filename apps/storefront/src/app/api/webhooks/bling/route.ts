import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try { body = await req.json(); } catch { /* */ }
  const event = (body as { evento?: string; tipo?: string }).evento ?? (body as { tipo?: string }).tipo ?? 'unknown';
  logger.info({
    provider: 'bling',
    event,
    bodyKeys: Object.keys(body as object).slice(0, 10),
  }, 'webhook received (stub)');
  return NextResponse.json({ ok: true, received: true, processed: false });
}
