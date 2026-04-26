/**
 * Checkout config helpers — fonte única de verdade pra incentivos visuais
 * (Pix discount, etc.).
 *
 * Hoje a fonte de configuração é a env var `NEXT_PUBLIC_PIX_DISCOUNT_PCT`
 * (default 5). No futuro, quando o storefront ler o tenant config no client,
 * o caminho será `tenant.config.checkout.pixDiscountPct` — substituir aqui
 * mantendo a mesma assinatura.
 *
 * O backend (apps/storefront/src/app/api/orders/route.ts) já aplica o desconto
 * de 5% para pix; manter o pct alinhado com o backend até o backend ler do
 * tenant config também.
 */

const DEFAULT_PIX_DISCOUNT_PCT = 5;

export function getPixDiscountPct(): number {
  const raw = process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;
  if (!raw) return DEFAULT_PIX_DISCOUNT_PCT;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PIX_DISCOUNT_PCT;
  // Clamp 0..50 — segurança contra config absurda
  return Math.max(0, Math.min(50, parsed));
}

export function applyPixDiscount(totalCents: number): number {
  const pct = getPixDiscountPct();
  return Math.round(totalCents * (1 - pct / 100));
}

export function pixDiscountAmountCents(totalCents: number): number {
  const pct = getPixDiscountPct();
  return Math.round(totalCents * (pct / 100));
}
