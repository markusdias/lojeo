import { NextResponse } from 'next/server';
import { db, tenants } from '@lojeo/db';

export async function GET() {
  try {
    await db.select().from(tenants).limit(1);
    return NextResponse.json({ ok: true, db: 'up' });
  } catch (err) {
    return NextResponse.json({ ok: false, db: 'down', error: String(err) }, { status: 503 });
  }
}
