export function formatMoneyCents(cents: number, currency: string, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export interface DiscountInput {
  priceCents: number;
  comparePriceCents?: number | null;
}

export function discountPercent(p: DiscountInput): number {
  if (!p.comparePriceCents || p.comparePriceCents <= p.priceCents) return 0;
  return Math.round(((p.comparePriceCents - p.priceCents) / p.comparePriceCents) * 100);
}

export interface PixIncentiveOpts {
  enabled: boolean;
  percent: number;
}

export function applyPixIncentive(priceCents: number, opts: PixIncentiveOpts): number {
  if (!opts.enabled || opts.percent <= 0) return priceCents;
  return Math.round(priceCents * (1 - opts.percent / 100));
}
