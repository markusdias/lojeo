// Fraud detection score — heurística simples e auditavel.
//
// Score 0-100. Threshold > 70: caller deve flagar pra revisão manual.
// Cada sinal contribui pontos. V1 calibrado pra precisão > recall (evita
// flags falsos em lojistas pequenos com pouco histórico).

export interface FraudSignals {
  /** Email do cliente nunca usado em pedido anterior. */
  newEmail: boolean;
  /** Total do pedido em cents. */
  orderTotalCents: number;
  /** Pedido tem cupom de desconto agressivo (>30%)? */
  aggressiveCouponDiscountBps?: number;
  /** Pedidos anteriores deste cliente nas últimas 24h. */
  ordersLast24h: number;
  /** Pedidos anteriores deste cliente all-time. */
  ordersAllTime: number;
  /** IP de país diferente do shipping address? */
  ipCountryMismatch?: boolean;
  /** IP é de VPN/proxy conhecido? (V2: lookup IPQS/MaxMind) */
  ipFromVpnOrProxy?: boolean;
  /** Customer email é gratuito disposable (mailinator, tempmail)? */
  emailIsDisposable?: boolean;
  /** Phone tem padrão suspeito (todos digits iguais, sequence)? */
  phoneSuspicious?: boolean;
  /** Mismatch billing vs shipping address? */
  billingShippingMismatch?: boolean;
}

export interface FraudScoreResult {
  score: number;
  level: 'low' | 'medium' | 'high';
  signals: Array<{ name: string; points: number }>;
  recommendation: 'approve' | 'review' | 'block';
}

const HIGH_VALUE_CENTS = 200000;     // R$ 2.000 / $200 — primeiro tier alto
const VERY_HIGH_VALUE_CENTS = 500000; // R$ 5.000 / $500
const VELOCITY_24H = 3;              // 3+ pedidos 24h é suspeito

export function computeFraudScore(signals: FraudSignals): FraudScoreResult {
  const contributions: Array<{ name: string; points: number }> = [];

  if (signals.newEmail) contributions.push({ name: 'new_email', points: 10 });

  if (signals.orderTotalCents >= VERY_HIGH_VALUE_CENTS) {
    contributions.push({ name: 'very_high_value', points: 25 });
  } else if (signals.orderTotalCents >= HIGH_VALUE_CENTS) {
    contributions.push({ name: 'high_value', points: 12 });
  }

  if (signals.aggressiveCouponDiscountBps && signals.aggressiveCouponDiscountBps >= 3000) {
    contributions.push({ name: 'aggressive_coupon', points: 8 });
  }

  if (signals.ordersLast24h >= VELOCITY_24H) {
    contributions.push({ name: 'velocity_24h', points: 20 });
  }

  // Cliente novo + valor alto → bandeira: combo é o sinal forte.
  if (signals.newEmail && signals.ordersAllTime === 0 && signals.orderTotalCents >= HIGH_VALUE_CENTS) {
    contributions.push({ name: 'first_order_high_value', points: 15 });
  }

  if (signals.ipCountryMismatch) contributions.push({ name: 'ip_country_mismatch', points: 18 });
  if (signals.ipFromVpnOrProxy) contributions.push({ name: 'ip_vpn_or_proxy', points: 22 });
  if (signals.emailIsDisposable) contributions.push({ name: 'email_disposable', points: 30 });
  if (signals.phoneSuspicious) contributions.push({ name: 'phone_suspicious', points: 8 });
  if (signals.billingShippingMismatch) contributions.push({ name: 'billing_shipping_mismatch', points: 6 });

  const rawScore = contributions.reduce((s, c) => s + c.points, 0);
  const score = Math.min(100, rawScore);

  let level: FraudScoreResult['level'];
  let recommendation: FraudScoreResult['recommendation'];
  if (score >= 80) {
    level = 'high';
    recommendation = 'block';
  } else if (score >= 50) {
    level = 'high';
    recommendation = 'review';
  } else if (score >= 25) {
    level = 'medium';
    recommendation = 'review';
  } else {
    level = 'low';
    recommendation = 'approve';
  }

  return { score, level, signals: contributions, recommendation };
}

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'guerrillamail.com',
  '10minutemail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'sharklasers.com',
  'getnada.com',
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function isPhoneSuspicious(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) return true;
  // Todos digits iguais (1111111, 9999999)
  if (/^(\d)\1+$/.test(digits)) return true;
  // Sequência (12345678, 87654321)
  if (digits === '12345678' || digits === '87654321' || digits === '123456789') return true;
  return false;
}
