// Decide qual gateway de pagamento usar baseado em currency + paymentMethod.
//
// BRL: Mercado Pago (Pix, credit_card, boleto).
// USD/EUR/GBP/CAD: Stripe (apenas credit_card por enquanto).
//
// Helper puro pra ser testável independente de DB/HTTP.

import type { SupportedCurrency } from '@lojeo/engine';

export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';
export type PaymentGateway = 'mercadopago' | 'stripe';

export interface GatewayDecision {
  gateway: PaymentGateway;
}

export interface GatewayError {
  error: string;
  reason: string;
}

export function selectGateway(
  currency: SupportedCurrency,
  paymentMethod: PaymentMethod,
): GatewayDecision | GatewayError {
  if (currency === 'BRL') {
    if (!['pix', 'credit_card', 'boleto'].includes(paymentMethod)) {
      return { error: 'invalid_payment_method', reason: 'BRL accepts pix|credit_card|boleto' };
    }
    return { gateway: 'mercadopago' };
  }
  // International — Stripe only
  if (paymentMethod !== 'credit_card') {
    return {
      error: 'invalid_payment_method_for_currency',
      reason: `${currency} accepts credit_card only (Stripe). Pix/boleto are BRL-only.`,
    };
  }
  return { gateway: 'stripe' };
}

export function isGatewayDecision(r: GatewayDecision | GatewayError): r is GatewayDecision {
  return 'gateway' in r;
}

export function stripeCurrency(c: SupportedCurrency): 'USD' | 'EUR' | 'GBP' | 'CAD' {
  // BRL é caso BR — não chega aqui. Cast type-safe pra union do Stripe helper.
  if (c === 'BRL') throw new Error('stripeCurrency_called_with_BRL');
  return c;
}
