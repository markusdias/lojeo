import { NextResponse } from 'next/server';
import { ingest } from '@lojeo/tracking/server';

export async function POST(req: Request) {
  const payload = await req.json();
  const userAgent = req.headers.get('user-agent') ?? undefined;
  try {
    const r = await ingest(payload, { userAgent });
    return NextResponse.json(r, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
