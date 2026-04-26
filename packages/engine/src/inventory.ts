import { eq, and, sql } from 'drizzle-orm';
import {
  db,
  inventoryStock,
  inventoryLocations,
  inventoryMovements,
} from '@lojeo/db';

export type MovementType =
  | 'inbound'
  | 'outbound'
  | 'adjustment'
  | 'reservation'
  | 'release'
  | 'transfer';

export interface AdjustStockInput {
  tenantId: string;
  variantId: string;
  locationId: string;
  qtyDelta: number;
  movementType: MovementType;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
}

/**
 * Ajusta estoque atomicamente: insere/atualiza inventory_stock + grava movimentação.
 * Sempre retorna o saldo final pra evitar race conditions.
 */
export async function adjustStock(input: AdjustStockInput) {
  const existing = await db.query.inventoryStock.findFirst({
    where: and(
      eq(inventoryStock.tenantId, input.tenantId),
      eq(inventoryStock.locationId, input.locationId),
      eq(inventoryStock.variantId, input.variantId),
    ),
  });

  let stockRow;
  if (existing) {
    const updated = await db
      .update(inventoryStock)
      .set({ qty: sql`${inventoryStock.qty} + ${input.qtyDelta}`, updatedAt: new Date() })
      .where(eq(inventoryStock.id, existing.id))
      .returning();
    stockRow = updated[0]!;
  } else {
    const inserted = await db
      .insert(inventoryStock)
      .values({
        tenantId: input.tenantId,
        locationId: input.locationId,
        variantId: input.variantId,
        qty: Math.max(0, input.qtyDelta),
      })
      .returning();
    stockRow = inserted[0]!;
  }

  await db.insert(inventoryMovements).values({
    tenantId: input.tenantId,
    locationId: input.locationId,
    variantId: input.variantId,
    movementType: input.movementType,
    qtyDelta: input.qtyDelta,
    reason: input.reason,
    referenceType: input.referenceType,
    referenceId: input.referenceId as `${string}-${string}-${string}-${string}-${string}` | undefined,
  });

  return stockRow;
}

export async function getOrCreatePrimaryLocation(tenantId: string) {
  const existing = await db.query.inventoryLocations.findFirst({
    where: and(
      eq(inventoryLocations.tenantId, tenantId),
      eq(inventoryLocations.isPrimary, true),
    ),
  });
  if (existing) return existing;

  const inserted = await db
    .insert(inventoryLocations)
    .values({
      tenantId,
      name: 'Depósito principal',
      code: 'main',
      isPrimary: true,
    })
    .returning();
  return inserted[0]!;
}

export async function availableQty(tenantId: string, variantId: string): Promise<number> {
  const rows = await db
    .select({
      qty: inventoryStock.qty,
      reserved: inventoryStock.reserved,
    })
    .from(inventoryStock)
    .where(
      and(eq(inventoryStock.tenantId, tenantId), eq(inventoryStock.variantId, variantId)),
    );
  return rows.reduce((sum, r) => sum + Math.max(0, r.qty - r.reserved), 0);
}
