/**
 * Warranty engine — pure functions to compute warranty expiry from order data.
 *
 * Warranty starts at order delivery (or paid_at as fallback), runs for
 * product.warrantyMonths months. Status:
 *  - active   : ainda dentro do período
 *  - expiring : vence em <= 30 dias
 *  - expired  : prazo já passou
 *  - none     : produto sem warrantyMonths configurado
 */

export type WarrantyStatus = 'active' | 'expiring_soon' | 'expired' | 'none';

export interface WarrantyInput {
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  warrantyMonths: number | null | undefined;
  /** Inicio do warranty: deliveredAt > paidAt > createdAt (cliente prefere delivered) */
  startsAt: Date;
}

export interface WarrantyResult {
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  startsAt: Date;
  expiresAt: Date | null;
  daysRemaining: number | null;
  status: WarrantyStatus;
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

export function computeWarranty(input: WarrantyInput, now: Date = new Date()): WarrantyResult {
  const months = input.warrantyMonths ?? 0;
  if (!months || months <= 0) {
    return {
      orderId: input.orderId,
      orderItemId: input.orderItemId,
      productId: input.productId,
      productName: input.productName,
      startsAt: input.startsAt,
      expiresAt: null,
      daysRemaining: null,
      status: 'none',
    };
  }

  const expiresAt = new Date(input.startsAt.getTime() + months * MONTH_MS);
  const msRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / DAY_MS);

  let status: WarrantyStatus;
  if (msRemaining <= 0) status = 'expired';
  else if (daysRemaining <= EXPIRING_SOON_DAYS) status = 'expiring_soon';
  else status = 'active';

  return {
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    productId: input.productId,
    productName: input.productName,
    startsAt: input.startsAt,
    expiresAt,
    daysRemaining,
    status,
  };
}

export function computeWarrantyBatch(inputs: WarrantyInput[], now: Date = new Date()): WarrantyResult[] {
  return inputs.map(i => computeWarranty(i, now));
}

/**
 * Filtra warranties que expiram nos próximos N dias (não expiradas ainda).
 */
export function expiringWithinDays(results: WarrantyResult[], days: number, now: Date = new Date()): WarrantyResult[] {
  const cutoff = now.getTime() + days * DAY_MS;
  return results.filter(r =>
    r.expiresAt !== null
    && r.status !== 'expired'
    && r.expiresAt.getTime() <= cutoff
  );
}
