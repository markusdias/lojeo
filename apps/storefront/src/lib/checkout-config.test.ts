import { afterEach, describe, expect, it } from 'vitest';
import { applyPixDiscount, getPixDiscountPct, pixDiscountAmountCents } from './checkout-config';

const ORIGINAL = process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;
  else process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = ORIGINAL;
});

describe('checkout-config · pix discount', () => {
  it('default 5% quando env não setado', () => {
    delete process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;
    expect(getPixDiscountPct()).toBe(5);
  });

  it('respeita env válido', () => {
    process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = '7';
    expect(getPixDiscountPct()).toBe(7);
  });

  it('faz clamp entre 0 e 50', () => {
    process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = '999';
    expect(getPixDiscountPct()).toBe(50);
    process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = '-3';
    expect(getPixDiscountPct()).toBe(0);
  });

  it('volta ao default em valor inválido', () => {
    process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = 'abacate';
    expect(getPixDiscountPct()).toBe(5);
  });

  it('applyPixDiscount calcula valor com desconto', () => {
    delete process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;
    expect(applyPixDiscount(10000)).toBe(9500); // 5% off de R$100 → R$95
    expect(applyPixDiscount(0)).toBe(0);
  });

  it('pixDiscountAmountCents retorna economia', () => {
    delete process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT;
    expect(pixDiscountAmountCents(10000)).toBe(500);
    process.env.NEXT_PUBLIC_PIX_DISCOUNT_PCT = '10';
    expect(pixDiscountAmountCents(20000)).toBe(2000);
  });
});
