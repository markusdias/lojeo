/**
 * Estatistica de A/B test: z-test 2-prop + p-value (normal approx).
 *
 * Decisao de design v1: usar Frequentist 2-prop z-test por simplicidade
 * e por ser o que o lojista MEI espera ver. V2: Bayesian credible interval
 * elimina problema de "peeking" — para Sprint 14+ ou Fase 2.
 */

/**
 * CDF da normal padrao via aprox Abramowitz & Stegun 26.2.17.
 * Max erro absoluto ~7.5e-8 — sobra-folga para p-values em A/B testing.
 */
export function normalCdf(x: number): number {
  if (x === 0) return 0.5;
  const ax = Math.abs(x);
  const t = 1.0 / (1.0 + 0.2316419 * ax);
  const d = 0.3989422804014327 * Math.exp((-ax * ax) / 2);
  const p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

export interface VariantSignificance {
  /** z-score 2-prop (variante - controle / SE_pool) */
  zScore: number;
  /** p-value bilateral (H0: nenhuma diferenca real) */
  pValue: number;
  /** Lift absoluto: variantRate - controlRate */
  liftAbs: number;
  /** Lift relativo em %: (variantRate - controlRate) / controlRate * 100 */
  liftPct: number;
  /** Confianca em %: (1 - p_one_tailed) * 100, capped 0..99.9 */
  confidencePct: number;
  /** True quando p-value < 0.05 (95% confianca, two-tailed) */
  isSignificant: boolean;
  /** True quando ambas variantes >= 1000 exposicoes (heuristica robustez) */
  hasEnoughSample: boolean;
}

export interface VariantInput {
  exposures: number;
  conversions: number;
}

/**
 * Calcula significancia estatistica de uma variante vs controle.
 *
 * Retorna p-value=1, zero significancia quando dados insuficientes (sem
 * exposicoes em qualquer lado), evitando NaN/Infinity em UI.
 */
export function variantSignificance(control: VariantInput, variant: VariantInput): VariantSignificance {
  const n1 = Math.max(0, control.exposures);
  const n2 = Math.max(0, variant.exposures);
  const c1 = Math.max(0, Math.min(control.conversions, n1));
  const c2 = Math.max(0, Math.min(variant.conversions, n2));

  if (n1 === 0 || n2 === 0) {
    return {
      zScore: 0,
      pValue: 1,
      liftAbs: 0,
      liftPct: 0,
      confidencePct: 0,
      isSignificant: false,
      hasEnoughSample: false,
    };
  }

  const p1 = c1 / n1;
  const p2 = c2 / n2;
  const pPool = (c1 + c2) / (n1 + n2);
  const seSq = pPool * (1 - pPool) * (1 / n1 + 1 / n2);
  const se = Math.sqrt(seSq);

  let zScore = 0;
  if (se > 0) {
    zScore = (p2 - p1) / se;
  }

  const pTwoTailed = se > 0 ? 2 * (1 - normalCdf(Math.abs(zScore))) : 1;
  // Confianca = P(variante > controle | dados) ~= normalCdf(z)
  //   z >> 0 → ~100% (variante muito melhor)
  //   z = 0  → 50% (mesma)
  //   z << 0 → ~0%   (variante pior)
  const confidencePct = Math.max(0, Math.min(99.9, normalCdf(zScore) * 100));

  const liftAbs = p2 - p1;
  const liftPct = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  return {
    zScore: Number(zScore.toFixed(4)),
    pValue: Number(pTwoTailed.toFixed(4)),
    liftAbs: Number(liftAbs.toFixed(6)),
    liftPct: Number(liftPct.toFixed(2)),
    confidencePct: Number(confidencePct.toFixed(2)),
    isSignificant: pTwoTailed < 0.05,
    hasEnoughSample: n1 >= 1000 && n2 >= 1000,
  };
}
