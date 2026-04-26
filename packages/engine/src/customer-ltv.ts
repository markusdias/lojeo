export interface OrderForLtv {
  email: string;
  totalCents: number;
  createdAt: Date;
  status: string;
}

export interface LtvResult {
  email: string;
  totalCents: number;
  ltvUsd: number; // 1 USD = 5 BRL aprox v1
  orderCount: number;
  avgOrderCents: number;
  firstOrderAt: Date;
  lastOrderAt: Date;
  daysActive: number;
  expectedLifetimeMonths: number; // heurística baseada em recência
}

const BRL_PER_USD = 5;
const ACTIVE_THRESHOLD_DAYS = 90;

function isCancelled(status: string): boolean {
  return status === 'cancelled';
}

export function computeCustomerLtv(
  orders: OrderForLtv[],
  email: string,
  now: Date = new Date(),
): LtvResult | null {
  const valid = orders.filter(o => o.email === email && !isCancelled(o.status));
  if (valid.length === 0) return null;

  const totalCents = valid.reduce((sum, o) => sum + o.totalCents, 0);
  const orderCount = valid.length;
  const avgOrderCents = Math.round(totalCents / orderCount);

  const sorted = [...valid].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const firstOrderAt = sorted[0]!.createdAt;
  const lastOrderAt = sorted[sorted.length - 1]!.createdAt;

  const daysActive = Math.max(
    0,
    Math.floor((lastOrderAt.getTime() - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  const daysSinceLast = Math.floor(
    (now.getTime() - lastOrderAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const monthsActive = daysActive / 30;
  const expectedLifetimeMonths =
    daysSinceLast < ACTIVE_THRESHOLD_DAYS
      ? Math.max(12, monthsActive * 1.5)
      : monthsActive;

  // 100 cents = 1 BRL → /100 → BRL → /BRL_PER_USD → USD
  const ltvUsd = Math.round((totalCents / 100 / BRL_PER_USD) * 100) / 100;

  return {
    email,
    totalCents,
    ltvUsd,
    orderCount,
    avgOrderCents,
    firstOrderAt,
    lastOrderAt,
    daysActive,
    expectedLifetimeMonths: Math.round(expectedLifetimeMonths * 10) / 10,
  };
}

export function computeLtvBatch(
  orders: OrderForLtv[],
  now: Date = new Date(),
): LtvResult[] {
  const emails = new Set<string>();
  for (const o of orders) {
    if (!isCancelled(o.status)) emails.add(o.email);
  }
  const results: LtvResult[] = [];
  for (const email of emails) {
    const r = computeCustomerLtv(orders, email, now);
    if (r) results.push(r);
  }
  return results.sort((a, b) => b.totalCents - a.totalCents);
}
