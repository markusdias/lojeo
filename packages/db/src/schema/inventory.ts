import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  boolean,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { productVariants } from './products';

/**
 * Locations representam centros de distribuição / depósitos.
 * Fase 1: lojista usa 1 location default. Fase 2: multi-CD com regras.
 */
export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 200 }).notNull(),
    code: varchar('code', { length: 32 }).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    countryCode: varchar('country_code', { length: 2 }).default('BR').notNull(),
    postalCode: varchar('postal_code', { length: 16 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('idx_locations_tenant_code').on(t.tenantId, t.code)],
);

/**
 * Inventory por (tenant, location, variant). On-hand = qty; available = qty - reserved.
 * Reservas vêm de pedidos não confirmados, carrinho ativo, etc.
 */
export const inventoryStock = pgTable(
  'inventory_stock',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    qty: integer('qty').default(0).notNull(),
    reserved: integer('reserved').default(0).notNull(),
    lowStockThreshold: integer('low_stock_threshold').default(0).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_stock_tenant_loc_variant').on(t.tenantId, t.locationId, t.variantId),
    index('idx_stock_tenant_variant').on(t.tenantId, t.variantId),
  ],
);

/**
 * Movimentações de estoque — auditoria + reconstrução de saldo.
 * Tipos: 'inbound' (recebimento), 'outbound' (venda/envio), 'adjustment' (ajuste manual),
 * 'reservation' (reserva pra carrinho/pedido), 'release' (libera reserva), 'transfer' (entre locations).
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    movementType: varchar('movement_type', { length: 32 }).notNull(),
    qtyDelta: integer('qty_delta').notNull(),
    reason: varchar('reason', { length: 200 }),
    referenceType: varchar('reference_type', { length: 64 }),
    referenceId: uuid('reference_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_movements_tenant_time').on(t.tenantId, t.createdAt),
    index('idx_movements_variant_time').on(t.variantId, t.createdAt),
  ],
);

export type InventoryLocation = typeof inventoryLocations.$inferSelect;
export type InventoryStock = typeof inventoryStock.$inferSelect;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
