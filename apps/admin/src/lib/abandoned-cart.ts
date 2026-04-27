// Helpers puros para agregação de carrinhos abandonados.
//
// Recebe lista de behavior_events recentes (cart_add + checkout_complete) e
// agrupa por sessionId. Sessão considerada abandonada se tem cart_add sem
// checkout_complete posterior. Itens consolidados (qty somada por productId).
//
// O cron route em /api/cron/abandoned-cart-check chama estas funções após
// puxar eventos e produtos do banco. Mantém cron route fino e helpers
// testáveis.

export interface AbandonedCartEventLike {
  sessionId: string;
  anonymousId: string;
  userId: string | null;
  eventType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
}

export interface ProductSummary {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
}

export interface AggregatedCartItem {
  productId: string;
  name: string;
  qty: number;
  priceCents: number;
  imageUrl?: string | null;
}

export interface AggregatedCart {
  sessionId: string;
  anonymousId: string;
  userId: string | null;
  items: AggregatedCartItem[];
  subtotalCents: number;
  lastEventAt: Date;
}

function readQty(metadata: unknown): number {
  if (metadata && typeof metadata === 'object' && 'qty' in metadata) {
    const q = (metadata as { qty?: unknown }).qty;
    if (typeof q === 'number' && q > 0) return Math.floor(q);
  }
  return 1;
}

/**
 * Filtra sessões com cart_add sem checkout_complete posterior.
 * Retorna Map<sessionId, lastCartAddAt> para sessões abandonadas.
 */
export function detectAbandonedSessions(
  events: AbandonedCartEventLike[],
): Map<string, Date> {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const lastCartAdd = new Map<string, Date>();
  const lastCheckoutComplete = new Map<string, Date>();
  for (const e of sorted) {
    if (e.eventType === 'cart_add') lastCartAdd.set(e.sessionId, e.createdAt);
    else if (e.eventType === 'checkout_complete') lastCheckoutComplete.set(e.sessionId, e.createdAt);
  }
  const abandoned = new Map<string, Date>();
  for (const [sid, addAt] of lastCartAdd) {
    const completedAt = lastCheckoutComplete.get(sid);
    if (!completedAt || completedAt.getTime() < addAt.getTime()) {
      abandoned.set(sid, addAt);
    }
  }
  return abandoned;
}

/**
 * Agrega cart_add events em items consolidados por session.
 * Pula sessões não-abandonadas. Pula items sem produto resolvido.
 */
export function aggregateAbandonedCarts(
  events: AbandonedCartEventLike[],
  productsById: Map<string, ProductSummary>,
): AggregatedCart[] {
  const abandoned = detectAbandonedSessions(events);
  if (abandoned.size === 0) return [];

  const carts = new Map<string, AggregatedCart>();
  for (const e of events) {
    if (e.eventType !== 'cart_add') continue;
    if (!abandoned.has(e.sessionId)) continue;
    if (!e.entityId) continue;
    const product = productsById.get(e.entityId);
    if (!product) continue;
    const qty = readQty(e.metadata);

    let cart = carts.get(e.sessionId);
    if (!cart) {
      cart = {
        sessionId: e.sessionId,
        anonymousId: e.anonymousId,
        userId: e.userId,
        items: [],
        subtotalCents: 0,
        lastEventAt: abandoned.get(e.sessionId)!,
      };
      carts.set(e.sessionId, cart);
    }

    const existing = cart.items.find((it) => it.productId === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      cart.items.push({
        productId: product.id,
        name: product.name,
        qty,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl ?? null,
      });
    }
  }

  for (const cart of carts.values()) {
    cart.subtotalCents = cart.items.reduce((sum, it) => sum + it.priceCents * it.qty, 0);
  }

  return [...carts.values()].filter((c) => c.items.length > 0);
}

/**
 * Decide se cart deve ser notificado nesta execução do cron.
 * - Sem contactEmail: nunca (status `pending_email` poderia ser explorado depois).
 * - lastNotifiedAt nulo: notificar.
 * - lastNotifiedAt < (agora - dedupHours): notificar.
 */
export function shouldNotify(
  contactEmail: string | null | undefined,
  lastNotifiedAt: Date | null | undefined,
  now: Date,
  dedupHours = 24,
): boolean {
  if (!contactEmail) return false;
  if (!lastNotifiedAt) return true;
  const cutoff = new Date(now.getTime() - dedupHours * 60 * 60 * 1000);
  return lastNotifiedAt.getTime() < cutoff.getTime();
}
