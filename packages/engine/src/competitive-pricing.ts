// Sprint 8 — competitive monitoring helper.
// Calcula gap entre nosso preço e o do concorrente.

export type PriceGapDirection = 'lower' | 'higher' | 'equal';

export interface PriceGap {
  /** Diferença absoluta em cents (sempre positiva). */
  absCents: number;
  /** Diferença percentual relativa ao preço do concorrente (arredondada 1 casa decimal). */
  percent: number;
  /** Direção do nosso preço em relação ao concorrente. */
  direction: PriceGapDirection;
}

/**
 * Compara nosso preço (`ourCents`) com o do concorrente (`competitorCents`).
 * Retorna gap absoluto, percentual relativo ao concorrente e direção.
 *
 * Inputs inválidos (NaN, negativos, competitorCents = 0) retornam gap zerado
 * para não derrubar UI — modo degradado.
 */
export function computePriceGap(ourCents: number, competitorCents: number): PriceGap {
  if (
    !Number.isFinite(ourCents) ||
    !Number.isFinite(competitorCents) ||
    ourCents < 0 ||
    competitorCents <= 0
  ) {
    return { absCents: 0, percent: 0, direction: 'equal' };
  }

  const diff = ourCents - competitorCents;
  const absCents = Math.abs(diff);
  const percent = Math.round((diff / competitorCents) * 1000) / 10; // 1 casa decimal
  const direction: PriceGapDirection =
    diff < 0 ? 'lower' : diff > 0 ? 'higher' : 'equal';

  return { absCents, percent: Math.abs(percent), direction };
}
