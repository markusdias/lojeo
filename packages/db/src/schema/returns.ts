import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';
import { orders, orderItems } from './orders';

// ── Return requests (trocas / devoluções) ────────────────────────────────────
//
// Sprint 6 v1: workflow puramente baseado em status.
// Sprint 6 v2 (futuro): integração com Melhor Envio (etiqueta reversa) e Bling
// (NF-e de devolução). Não criamos colunas para isso ainda — adicionar via ALTER
// quando a integração entrar.
//
// type:
//   'exchange'      → cliente quer trocar (ex.: tamanho/cor)
//   'refund'        → cliente quer dinheiro de volta
//   'store_credit'  → cliente aceita crédito da loja
//
// reason (motivo livre dentro de um conjunto curto):
//   'wrong_item' | 'damaged' | 'no_longer_wanted' | 'wrong_size' | 'other'
//
// status (state machine — ver returnStateMachine.ts):
//   requested → analyzing → (approved | rejected)
//   approved  → awaiting_product → received → finalized
//   rejected é estado final
//
// orderItemId NULL = devolução do pedido inteiro
// userId NULL = guest (cliente identificado por customerEmail vinculado ao order)
// refundCents NULL = ainda não calculado (lojista define no approve)

export const returnRequests = pgTable(
  'return_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    // null = devolução do pedido inteiro
    orderItemId: uuid('order_item_id').references(() => orderItems.id, { onDelete: 'set null' }),
    // null = guest (pedido feito sem login)
    userId: uuid('user_id'),
    customerEmail: varchar('customer_email', { length: 300 }),
    type: varchar('type', { length: 20 }).notNull(),
    reason: varchar('reason', { length: 60 }).notNull(),
    reasonDetails: text('reason_details'),
    status: varchar('status', { length: 20 }).default('requested').notNull(),
    resolutionNotes: text('resolution_notes'),
    refundCents: integer('refund_cents'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    finalizedAt: timestamp('finalized_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('idx_returns_tenant_status').on(t.tenantId, t.status),
    index('idx_returns_tenant_order').on(t.tenantId, t.orderId),
    index('idx_returns_user').on(t.userId),
    index('idx_returns_customer_email').on(t.tenantId, t.customerEmail),
  ],
);

export type ReturnRequest = typeof returnRequests.$inferSelect;
export type NewReturnRequest = typeof returnRequests.$inferInsert;

export type ReturnType = 'exchange' | 'refund' | 'store_credit';
export const RETURN_TYPES: readonly ReturnType[] = ['exchange', 'refund', 'store_credit'] as const;

export type ReturnReason =
  | 'wrong_item'
  | 'damaged'
  | 'no_longer_wanted'
  | 'wrong_size'
  | 'other';
export const RETURN_REASONS: readonly ReturnReason[] = [
  'wrong_item',
  'damaged',
  'no_longer_wanted',
  'wrong_size',
  'other',
] as const;

export type ReturnStatus =
  | 'requested'
  | 'analyzing'
  | 'approved'
  | 'rejected'
  | 'awaiting_product'
  | 'received'
  | 'finalized';

export const RETURN_STATUSES: readonly ReturnStatus[] = [
  'requested',
  'analyzing',
  'approved',
  'rejected',
  'awaiting_product',
  'received',
  'finalized',
] as const;

/**
 * State machine de transições válidas.
 * - requested: aguardando triagem do lojista
 * - analyzing: lojista pegou o caso para revisar
 * - approved: aprovado — fluxo segue para awaiting_product
 * - rejected: terminal (negado)
 * - awaiting_product: aguardando cliente enviar a peça
 * - received: peça recebida pelo lojista
 * - finalized: terminal (reembolso/troca concluída)
 */
export const RETURN_TRANSITIONS: Record<ReturnStatus, readonly ReturnStatus[]> = {
  requested: ['analyzing', 'approved', 'rejected'],
  analyzing: ['approved', 'rejected'],
  approved: ['awaiting_product'],
  awaiting_product: ['received'],
  received: ['finalized'],
  rejected: [],
  finalized: [],
} as const;

export function canTransitionReturn(from: string, to: string): boolean {
  const allowed = RETURN_TRANSITIONS[from as ReturnStatus];
  if (!allowed) return false;
  return (allowed as readonly string[]).includes(to);
}
