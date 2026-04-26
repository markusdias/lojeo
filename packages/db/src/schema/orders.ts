import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { productVariants } from './products';

// ── Customer addresses (reusable across orders) ──────────────────────────────

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    // null = guest address (attached to order only)
    userId: uuid('user_id'),
    label: varchar('label', { length: 100 }),
    recipientName: varchar('recipient_name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    postalCode: varchar('postal_code', { length: 20 }).notNull(),
    street: varchar('street', { length: 300 }).notNull(),
    number: varchar('number', { length: 30 }).notNull(),
    complement: varchar('complement', { length: 100 }),
    neighborhood: varchar('neighborhood', { length: 100 }),
    city: varchar('city', { length: 150 }).notNull(),
    state: varchar('state', { length: 50 }).notNull(),
    country: varchar('country', { length: 2 }).default('BR').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantIdx: index('idx_addresses_tenant').on(t.tenantId),
    userIdx: index('idx_addresses_user').on(t.userId),
  })
);

// ── Orders ────────────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    // Human-readable order number e.g. "LJ-00042"
    orderNumber: varchar('order_number', { length: 30 }).notNull(),
    // null = guest checkout
    userId: uuid('user_id'),
    anonymousId: varchar('anonymous_id', { length: 64 }),
    status: varchar('status', { length: 30 }).default('pending').notNull(),
    // Snapshot of address at time of purchase
    shippingAddress: jsonb('shipping_address').notNull(),
    // Shipping method selected
    shippingCarrier: varchar('shipping_carrier', { length: 100 }),
    shippingService: varchar('shipping_service', { length: 100 }),
    shippingDeadlineDays: integer('shipping_deadline_days'),
    shippingCents: integer('shipping_cents').default(0).notNull(),
    // Pricing
    subtotalCents: integer('subtotal_cents').notNull(),
    discountCents: integer('discount_cents').default(0).notNull(),
    totalCents: integer('total_cents').notNull(),
    // Payment
    paymentMethod: varchar('payment_method', { length: 50 }),
    paymentGateway: varchar('payment_gateway', { length: 50 }),
    // Gateway-specific reference (e.g. MP preference id, payment id)
    gatewayPaymentId: varchar('gateway_payment_id', { length: 200 }),
    gatewayStatus: varchar('gateway_status', { length: 50 }),
    // Coupon applied
    couponCode: varchar('coupon_code', { length: 50 }),
    couponDiscountCents: integer('coupon_discount_cents').default(0),
    // Fraud score 0–100 (0=clean, 100=block)
    fraudScore: integer('fraud_score'),
    // UTM attribution snapshot
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),
    utmCampaign: varchar('utm_campaign', { length: 100 }),
    // Shipping tracking
    trackingCode: varchar('tracking_code', { length: 100 }),
    shippedAt: timestamp('shipped_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    // Fiscal
    invoiceKey: varchar('invoice_key', { length: 60 }),
    invoiceUrl: text('invoice_url'),
    // Metadata for extensibility
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index('idx_orders_tenant_created').on(t.tenantId, t.createdAt),
    tenantStatusIdx: index('idx_orders_tenant_status').on(t.tenantId, t.status),
    orderNumberIdx: index('idx_orders_number').on(t.tenantId, t.orderNumber),
    gatewayIdx: index('idx_orders_gateway_payment').on(t.gatewayPaymentId),
    userIdx: index('idx_orders_user').on(t.userId),
  })
);

// ── Order items — snapshot of product at purchase time ────────────────────────

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    // Keep FK for inventory/analytics, but snapshot name/price
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    // Snapshots (never mutate with product changes)
    productName: varchar('product_name', { length: 300 }).notNull(),
    variantName: varchar('variant_name', { length: 200 }),
    sku: varchar('sku', { length: 100 }),
    imageUrl: text('image_url'),
    options: jsonb('options').default({}).notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    qty: integer('qty').notNull(),
    totalCents: integer('total_cents').notNull(),
  },
  (t) => ({
    orderIdx: index('idx_order_items_order').on(t.orderId),
    variantIdx: index('idx_order_items_variant').on(t.variantId),
  })
);

// ── Order events — audit trail of status transitions ──────────────────────────

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 60 }).notNull(),
    fromStatus: varchar('from_status', { length: 30 }),
    toStatus: varchar('to_status', { length: 30 }),
    // Actor: 'system' | 'webhook' | 'admin:{userId}' | 'customer'
    actor: varchar('actor', { length: 100 }).default('system').notNull(),
    notes: text('notes'),
    metadata: jsonb('metadata').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    orderIdx: index('idx_order_events_order').on(t.orderId),
    tenantTimeIdx: index('idx_order_events_tenant_time').on(t.tenantId, t.createdAt),
  })
);

// Types
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
