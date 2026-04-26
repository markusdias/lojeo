import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@lojeo/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { event?: string; data?: { id?: string; tracking?: string } } = {};
  try { body = await req.json() as typeof body; } catch { /* */ }
  logger.info({
    provider: 'melhor-envio',
    event: body.event,
    shipmentId: body.data?.id,
    tracking: body.data?.tracking?.slice(0, 20),
  }, 'webhook received (stub)');
  return NextResponse.json({ ok: true, received: true, processed: false });
}
