import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

// ── Recommendation overrides ──────────────────────────────────────────────────
//
// Sprint 11 — override manual de recomendações no admin.
// Permite ao lojista forçar (pin) ou bloquear (exclude) produtos específicos
// como recomendação numa PDP, sobrepondo o resultado do engine FBT.
//
// overrideType:
//   'pin'     → produto sempre aparece nas recomendações da PDP origem (no topo)
//   'exclude' → produto nunca aparece nas recomendações da PDP origem
//
// Unicidade por (tenantId, productId, recommendedProductId): cada par fonte→alvo
// só pode ter um tipo de override ativo. POST faz upsert por essa chave.

export const recommendationOverrides = pgTable(
  'recommendation_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(), // produto fonte (PDP)
    recommendedProductId: uuid('recommended_product_id').notNull(),
    overrideType: varchar('override_type', { length: 20 }).notNull(), // 'pin' | 'exclude'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_rec_overrides_tenant_product').on(t.tenantId, t.productId),
    uniqueIndex('uniq_rec_overrides_tenant_product_target').on(
      t.tenantId,
      t.productId,
      t.recommendedProductId,
    ),
  ],
);

export type RecommendationOverride = typeof recommendationOverrides.$inferSelect;
export type NewRecommendationOverride = typeof recommendationOverrides.$inferInsert;
