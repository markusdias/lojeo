import { describe, expect, it } from 'vitest';
import { computePriceGap } from './competitive-pricing';

describe('computePriceGap', () => {
  it('our price is lower → direction lower, percent positivo', () => {
    const gap = computePriceGap(8000, 10000);
    expect(gap.absCents).toBe(2000);
    expect(gap.percent).toBe(20);
    expect(gap.direction).toBe('lower');
  });

  it('our price is higher → direction higher, percent positivo', () => {
    const gap = computePriceGap(11000, 10000);
    expect(gap.absCents).toBe(1000);
    expect(gap.percent).toBe(10);
    expect(gap.direction).toBe('higher');
  });

  it('preços iguais → direction equal, percent 0', () => {
    const gap = computePriceGap(10000, 10000);
    expect(gap.absCents).toBe(0);
    expect(gap.percent).toBe(0);
    expect(gap.direction).toBe('equal');
  });

  it('inputs inválidos retornam gap zero (modo degradado)', () => {
    expect(computePriceGap(NaN, 10000)).toEqual({ absCents: 0, percent: 0, direction: 'equal' });
    expect(computePriceGap(10000, 0)).toEqual({ absCents: 0, percent: 0, direction: 'equal' });
    expect(computePriceGap(-100, 10000)).toEqual({ absCents: 0, percent: 0, direction: 'equal' });
  });
});
