import { describe, expect, it } from 'vitest';
import { normalCdf, variantSignificance } from './experiments-stats';

describe('normalCdf', () => {
  it('CDF(0) = 0.5', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 4);
  });
  it('CDF(1.96) ≈ 0.975 (95% confidence)', () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
  });
  it('CDF(-1.96) ≈ 0.025', () => {
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });
  it('CDF(2.576) ≈ 0.995 (99% confidence)', () => {
    expect(normalCdf(2.576)).toBeCloseTo(0.995, 3);
  });
});

describe('variantSignificance', () => {
  it('amostras vazias → pValue=1, não significativo', () => {
    const r = variantSignificance({ exposures: 0, conversions: 0 }, { exposures: 0, conversions: 0 });
    expect(r.pValue).toBe(1);
    expect(r.isSignificant).toBe(false);
    expect(r.hasEnoughSample).toBe(false);
  });

  it('variantes idênticas → lift 0, p-value alto', () => {
    const r = variantSignificance(
      { exposures: 1000, conversions: 100 },
      { exposures: 1000, conversions: 100 },
    );
    expect(r.liftPct).toBe(0);
    expect(r.zScore).toBe(0);
    expect(r.pValue).toBeCloseTo(1, 1);
    expect(r.isSignificant).toBe(false);
  });

  it('lift +50% relativo, n=1000+1000 → significativo', () => {
    const r = variantSignificance(
      { exposures: 1000, conversions: 80 }, // 8%
      { exposures: 1000, conversions: 120 }, // 12% → +50% lift
    );
    expect(r.liftPct).toBeCloseTo(50, 1);
    expect(r.isSignificant).toBe(true);
    expect(r.pValue).toBeLessThan(0.05);
    expect(r.hasEnoughSample).toBe(true);
    expect(r.confidencePct).toBeGreaterThan(95);
  });

  it('lift pequeno com n=100 → não significativo (sample baixo)', () => {
    const r = variantSignificance(
      { exposures: 100, conversions: 10 }, // 10%
      { exposures: 100, conversions: 12 }, // 12%
    );
    expect(r.isSignificant).toBe(false);
    expect(r.hasEnoughSample).toBe(false);
  });

  it('lift -20% (variante pior), n grande → significativo (z negativo)', () => {
    const r = variantSignificance(
      { exposures: 5000, conversions: 500 }, // 10%
      { exposures: 5000, conversions: 400 }, // 8% → -20%
    );
    expect(r.zScore).toBeLessThan(0);
    expect(r.liftPct).toBeCloseTo(-20, 0);
    expect(r.isSignificant).toBe(true);
    expect(r.confidencePct).toBeLessThan(50);
  });

  it('confidencePct cap em 99.9 mesmo com z absurdo', () => {
    const r = variantSignificance(
      { exposures: 100000, conversions: 5000 },
      { exposures: 100000, conversions: 15000 },
    );
    expect(r.confidencePct).toBe(99.9);
    expect(r.isSignificant).toBe(true);
  });

  it('liftPct=0 quando control rate é 0', () => {
    const r = variantSignificance(
      { exposures: 1000, conversions: 0 },
      { exposures: 1000, conversions: 50 },
    );
    expect(r.liftPct).toBe(0);
    expect(r.liftAbs).toBeCloseTo(0.05, 4);
  });
});
