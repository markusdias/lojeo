import { NextResponse } from 'next/server';
import { db, orders } from '@lojeo/db';
import { eq, and } from 'drizzle-orm';
import { computeCustomerLtv, type OrderForLtv } from '@lojeo/engine';

export const dynamic = 'force-dynamic';

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ email: string }> },
) {
  const tid = tenantId(req);
  const { email: encoded } = await params;
  const email = decodeURIComponent(encoded).toLowerCase();

  try {
    const rows = await db
      .select({
        customerEmail: orders.customerEmail,
        totalCents: orders.totalCents,
        createdAt: orders.createdAt,
        status: orders.status,
      })
      .from(orders)
      .where(and(eq(orders.tenantId, tid), eq(orders.customerEmail, email)));

    const input: OrderForLtv[] = rows.map(r => ({
      email: r.customerEmail ?? '',
      totalCents: r.totalCents ?? 0,
      createdAt: new Date(r.createdAt),
      status: r.status ?? 'pending',
    }));

    const result = computeCustomerLtv(input, email);
    if (!result) {
      return NextResponse.json({ ltv: null }, { status: 404 });
    }
    return NextResponse.json({ ltv: result });
  } catch {
    return NextResponse.json({ ltv: null }, { status: 500 });
  }
}
