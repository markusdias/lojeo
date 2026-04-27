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

/**
 * Verifica assinatura Stripe webhook (HMAC SHA256).
 * Header `Stripe-Signature: t=<timestamp>,v1=<signature>,v0=<...>`.
 * Sem STRIPE_WEBHOOK_SECRET: retorna true (modo dev).
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode aceita
  if (!signatureHeader) return false;

  const tMatch = signatureHeader.match(/t=(\d+)/);
  const v1Match = signatureHeader.match(/v1=([a-f0-9]+)/);
  if (!tMatch || !v1Match) return false;
  const ts = tMatch[1]!;
  const expectedSig = v1Match[1]!;

  const payload = `${ts}.${rawBody}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (computed.length !== expectedSig.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return diff === 0;
}

export async function fetchStripePaymentIntent(piId: string): Promise<{
  id: string;
  status: string;
  metadata?: { order_id?: string };
} | null> {
  const token = process.env.STRIPE_SECRET_KEY;
  if (!token) return null;
  try {
    const r = await fetch(`${STRIPE_BASE}/payment_intents/${piId}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json()) as { id: string; status: string; metadata?: { order_id?: string } };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'stripe fetch pi failed');
    return null;
  }
}
