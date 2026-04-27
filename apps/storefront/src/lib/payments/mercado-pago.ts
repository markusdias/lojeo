// Mercado Pago — preference creation + payment lookup.
//
// Sem ACCESS_TOKEN: modo mock retorna preference fake (orderId-as-id, init_point
// `/checkout/mock/{orderId}`). Loja continua funcionando — checkout finaliza,
// status fica `pending`, lojista marca paid manualmente em /pedidos.
//
// Com ACCESS_TOKEN: fetch real https://api.mercadopago.com/checkout/preferences.

import { logger } from '@lojeo/logger';

const MP_BASE = 'https://api.mercadopago.com';

export interface PreferenceItem {
  title: string;
  quantity: number;
  unit_price: number; // BRL (não cents)
  currency_id: 'BRL';
}

export interface PreferenceInput {
  orderId: string;
  orderNumber: string;
  items: PreferenceItem[];
  payerEmail?: string | null;
  totalCents: number;
  notificationUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  pendingUrl?: string;
}

export interface PreferenceResult {
  id: string;
  initPoint: string;
  sandboxInitPoint: string | null;
  source: 'mp' | 'mock';
}

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

export async function createMercadoPagoPreference(
  input: PreferenceInput,
): Promise<PreferenceResult> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    return {
      id: `mock-${input.orderId}`,
      initPoint: input.successUrl ?? `/checkout/sucesso?order=${input.orderId}`,
      sandboxInitPoint: null,
      source: 'mock',
    };
  }

  const payload = {
    external_reference: input.orderId,
    items: input.items.map((it, idx) => ({
      id: `${input.orderNumber}-${idx + 1}`,
      title: it.title.slice(0, 256),
      quantity: it.quantity,
      unit_price: it.unit_price,
      currency_id: it.currency_id,
    })),
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    notification_url: input.notificationUrl,
    back_urls: {
      success: input.successUrl,
      failure: input.failureUrl,
      pending: input.pendingUrl ?? input.successUrl,
    },
    auto_return: 'approved' as const,
  };

  try {
    const r = await fetch(`${MP_BASE}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      logger.warn({ status: r.status, body: text.slice(0, 500) }, 'mp preference creation failed');
      throw new Error(`mp_preference_failed_${r.status}`);
    }
    const data = (await r.json()) as { id: string; init_point: string; sandbox_init_point?: string };
    return {
      id: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point ?? null,
      source: 'mp',
    };
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, 'mp preference fetch threw');
    // Modo degradado: cair em mock para não quebrar checkout
    return {
      id: `mock-fallback-${input.orderId}`,
      initPoint: input.successUrl ?? `/checkout/sucesso?order=${input.orderId}`,
      sandboxInitPoint: null,
      source: 'mock',
    };
  }
}

export interface MpPayment {
  id: string;
  status: 'approved' | 'pending' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  payment_method_id: string;
  payment_type_id: string;
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MpPayment | null> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${MP_BASE}/v1/payments/${paymentId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      logger.warn({ status: r.status, paymentId }, 'mp payment fetch failed');
      return null;
    }
    return (await r.json()) as MpPayment;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err, paymentId }, 'mp payment fetch threw');
    return null;
  }
}

/**
 * Mapeia status MP para status interno do order.
 * approved/authorized → paid · rejected/cancelled → cancelled · resto → pending
 */
export function mpStatusToOrderStatus(mpStatus: MpPayment['status']): 'paid' | 'cancelled' | 'pending' {
  if (mpStatus === 'approved' || mpStatus === 'authorized') return 'paid';
  if (mpStatus === 'rejected' || mpStatus === 'cancelled') return 'cancelled';
  return 'pending';
}
