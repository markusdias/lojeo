// Stripe — international payments (USD/EUR). Sem SDK pra evitar dep extra;
// usamos fetch direto pra REST API. Mesmo padrão dual mock/real do MP.
//
// API ref: https://stripe.com/docs/api/payment_intents/create

import { logger } from '@lojeo/logger';

const STRIPE_BASE = 'https://api.stripe.com/v1';

export interface StripePaymentInput {
  orderId: string;
  orderNumber: string;
  totalCents: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'CAD';
  payerEmail: string;
  description?: string;
}

export interface StripePaymentResult {
  paymentIntentId: string;
  clientSecret: string;          // pra Stripe.js no frontend confirmar
  status: string;                // 'requires_payment_method' default
  source: 'stripe' | 'mock';
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Cria PaymentIntent Stripe. Frontend pega clientSecret e confirma via
 * Stripe.js (https://stripe.com/docs/payments/payment-intents).
 *
 * Sem token: mock pra preservar fluxo storefront em modo simulado.
 */
export async function createStripePaymentIntent(input: StripePaymentInput): Promise<StripePaymentResult> {
  const token = process.env.STRIPE_SECRET_KEY;
  if (!token) {
    return {
      paymentIntentId: `mock-pi-${input.orderId}`,
      clientSecret: `mock-pi-${input.orderId}_secret_test`,
      status: 'requires_payment_method',
      source: 'mock',
    };
  }

  // Stripe REST aceita application/x-www-form-urlencoded
  const params = new URLSearchParams();
  params.set('amount', String(input.totalCents));
  params.set('currency', input.currency.toLowerCase());
  params.set('description', input.description ?? `Order ${input.orderNumber}`);
  params.set('receipt_email', input.payerEmail);
  params.set('metadata[order_id]', input.orderId);
  params.set('metadata[order_number]', input.orderNumber);
  params.set('automatic_payment_methods[enabled]', 'true');

  try {
    const r = await fetch(`${STRIPE_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Bearer ${token}`,
        'idempotency-key': `pi-${input.orderId}`,
      },
      body: params.toString(),
    });
    if (!r.ok) {
      const text = await r.text();
      logger.warn({ status: r.status, body: text.slice(0, 500) }, 'stripe payment_intent failed');
      throw new Error(`stripe_pi_failed_${r.status}`);
    }
    const data = (await r.json()) as {
      id: string;
      client_secret: string;
      status: string;
    };
    return {
      paymentIntentId: data.id,
      clientSecret: data.client_secret,
      status: data.status,
      source: 'stripe',
    };
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, 'stripe payment_intent threw');
    return {
      paymentIntentId: `mock-pi-fallback-${input.orderId}`,
      clientSecret: `mock-fallback_secret_test`,
      status: 'requires_payment_method',
      source: 'mock',
    };
  }
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: { id: string; status?: string; metadata?: { order_id?: string } } };
}

/**
 * Mapeia status Stripe PaymentIntent para status interno do order.
 * succeeded → paid · canceled → cancelled · processing/requires_* → pending
 */
export function stripeStatusToOrderStatus(s: string): 'paid' | 'cancelled' | 'pending' {
  if (s === 'succeeded') return 'paid';
  if (s === 'canceled') return 'cancelled';
  return 'pending';
}
