// Warranty aggregation per customer — agrupa warranties expirando por cliente.
//
// Helper puro recebe order_items + products + filtra por dias até expiry,
// retorna lista por customerEmail.

import { computeWarranty, type WarrantyResult } from '@lojeo/engine';

export interface WarrantyAggregateInput {
  customerEmail: string | null;
  orderId: string;
  orderItemId: string;
  productId: string | null;
  productName: string;
  warrantyMonths: number | null | undefined;
  startsAt: Date;
}

export interface CustomerWarrantySummary {
  customerEmail: string;
  itemCount: number;
  earliestExpiresAt: Date | null;
  expiringSoon: WarrantyResult[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function aggregateWarrantiesByCustomer(
  inputs: WarrantyAggregateInput[],
  daysWindow: number,
  now: Date = new Date(),
): CustomerWarrantySummary[] {
  const cutoff = now.getTime() + daysWindow * DAY_MS;
  const byCustomer = new Map<string, CustomerWarrantySummary>();

  for (const input of inputs) {
    if (!input.customerEmail) continue;
    if (!input.warrantyMonths || input.warrantyMonths <= 0) continue;

    const result = computeWarranty(
      {
        orderId: input.orderId,
        orderItemId: input.orderItemId,
        productId: input.productId,
        productName: input.productName,
        warrantyMonths: input.warrantyMonths,
        startsAt: input.startsAt,
      },
      now,
    );

    if (!result.expiresAt) continue;
    if (result.status === 'expired') continue;
    if (result.expiresAt.getTime() > cutoff) continue;

    let summary = byCustomer.get(input.customerEmail);
    if (!summary) {
      summary = {
        customerEmail: input.customerEmail,
        itemCount: 0,
        earliestExpiresAt: null,
        expiringSoon: [],
      };
      byCustomer.set(input.customerEmail, summary);
    }
    summary.itemCount++;
    summary.expiringSoon.push(result);
    if (
      summary.earliestExpiresAt === null
      || result.expiresAt.getTime() < summary.earliestExpiresAt.getTime()
    ) {
      summary.earliestExpiresAt = result.expiresAt;
    }
  }

  return [...byCustomer.values()].sort((a, b) => {
    const aT = a.earliestExpiresAt?.getTime() ?? Infinity;
    const bT = b.earliestExpiresAt?.getTime() ?? Infinity;
    return aT - bT;
  });
}
