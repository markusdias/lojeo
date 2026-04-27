import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { products } from './products';

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

// ── Product embeddings (Sprint 12) ────────────────────────────────────────────
//
// Armazena embeddings vetoriais por produto para busca semântica e
// recomendações por similaridade.
//
// V1 (este sprint): mockEmbedding determinístico em packages/engine, persistido
// como JSON-encoded array de floats em coluna `text`. Comparação via
// cosineSimilarity em memória (varredura linear). Suporta até ~5k produtos por
// tenant sem degradação significativa.
//
// V2 (futuro): trocar provider por OpenAI/Cohere embeddings reais e migrar
// coluna `embedding` para tipo nativo `vector(N)` do pgvector + índice ivfflat
// vector_cosine_ops para busca eficiente em escala. A interface da função
// mockEmbedding foi desenhada para ser drop-in replacement.

export const productEmbeddings = pgTable(
  'product_embeddings',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    // JSON-encoded array de floats até pgvector type ser oficial via Drizzle.
    // Em V2 migrar para customType ou raw `vector(N)`.
    embedding: text('embedding'),
    model: varchar('model', { length: 40 }).default('mock-deterministic-256'),
    dimensions: integer('dimensions').default(256),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('idx_product_embeddings_tenant').on(t.tenantId)],
);

export type ProductEmbedding = typeof productEmbeddings.$inferSelect;
export type NewProductEmbedding = typeof productEmbeddings.$inferInsert;
