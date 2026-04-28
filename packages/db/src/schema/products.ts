import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 200 }).notNull(),
    name: varchar('name', { length: 300 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 100 }),
    status: varchar('status', { length: 24 }).default('draft').notNull(),
    priceCents: integer('price_cents').notNull(),
    comparePriceCents: integer('compare_price_cents'),
    costCents: integer('cost_cents'),
    currency: varchar('currency', { length: 3 }).default('BRL').notNull(),
    weightGrams: integer('weight_grams'),
    ncm: varchar('ncm', { length: 16 }),
    taxRegime: varchar('tax_regime', { length: 32 }),
    warrantyMonths: integer('warranty_months').default(12),
    customFields: jsonb('custom_fields').default({}).notNull(),
    seoTitle: varchar('seo_title', { length: 200 }),
    seoDescription: text('seo_description'),
    exportRestrictions: jsonb('export_restrictions').default({}).notNull(),
    presaleShipDate: timestamp('presale_ship_date', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_products_tenant_slug').on(t.tenantId, t.slug),
    index('idx_products_tenant_status').on(t.tenantId, t.status),
  ],
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 200 }),
    optionValues: jsonb('option_values').default({}).notNull(),
    priceCents: integer('price_cents'),
    stockQty: integer('stock_qty').default(0).notNull(),
    barcode: varchar('barcode', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_variants_tenant_sku').on(t.tenantId, t.sku),
    index('idx_variants_product').on(t.productId),
  ],
);

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    altText: text('alt_text'),
    position: integer('position').default(0).notNull(),
    isVideo: boolean('is_video').default(false).notNull(),
    width: integer('width'),
    height: integer('height'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_images_product').on(t.productId)],
);

export const collections = pgTable(
  'collections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 200 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    rules: jsonb('rules').default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex('idx_collections_tenant_slug').on(t.tenantId, t.slug)],
);

export const productCollections = pgTable(
  'product_collections',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    position: integer('position').default(0).notNull(),
  },
  (t) => [index('idx_pc_collection').on(t.collectionId), index('idx_pc_product').on(t.productId)],
);

export const productRedirects = pgTable(
  'product_redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    oldSlug: varchar('old_slug', { length: 200 }).notNull(),
    newSlug: varchar('new_slug', { length: 200 }),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
    reason: varchar('reason', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('idx_product_redirects_tenant_old').on(t.tenantId, t.oldSlug),
    index('idx_product_redirects_product').on(t.productId),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductRedirect = typeof productRedirects.$inferSelect;
