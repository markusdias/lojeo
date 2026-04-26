import { NextResponse } from 'next/server';
import { ingest } from '@lojeo/tracking/server';

function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    undefined
  );
}

export async function POST(req: Request) {
  const payload = await req.json();
  const userAgent = req.headers.get('user-agent') ?? undefined;
  const ipAddress = getClientIp(req);
  try {
    const r = await ingest(payload, { userAgent, ipAddress });
    return NextResponse.json(r, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
