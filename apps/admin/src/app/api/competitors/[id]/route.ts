import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, competitorProducts, competitorPriceHistory } from '@lojeo/db';
import { auth } from '../../../../auth';
import { TENANT_ID, requirePermission, recordAuditLog } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  try {
    await requirePermission(session, 'products', 'write');
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 403 });
  }

  const { id } = await params;

  const [existing] = await db.select()
    .from(competitorProducts)
    .where(and(eq(competitorProducts.id, id), eq(competitorProducts.tenantId, TENANT_ID)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Limpa histórico antes (sem FK no schema; mantemos consistência manualmente)
  await db.delete(competitorPriceHistory)
    .where(and(
      eq(competitorPriceHistory.tenantId, TENANT_ID),
      eq(competitorPriceHistory.competitorProductId, id),
    ));

  await db.delete(competitorProducts)
    .where(and(eq(competitorProducts.id, id), eq(competitorProducts.tenantId, TENANT_ID)));

  await recordAuditLog({
    session,
    action: 'competitor.delete',
    entityType: 'competitor',
    entityId: id,
    before: existing,
  });

  return NextResponse.json({ ok: true });
}
