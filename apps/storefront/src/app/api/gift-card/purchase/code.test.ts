import { describe, it, expect } from 'vitest';
import { generateGiftCode } from './code';

describe('generateGiftCode', () => {
  it('matches GIFT-XXXX-YYYY format', () => {
    const code = generateGiftCode();
    expect(code).toMatch(/^GIFT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it('avoids visually ambiguous chars (0, 1, I, L, O) inside random blocks', () => {
    // Prefixo "GIFT-" é literal e contém "I" — checamos só os blocos aleatórios.
    const banned = /[01ILO]/;
    for (let i = 0; i < 200; i++) {
      const code = generateGiftCode();
      const blocks = code.split('-').slice(1).join('');
      expect(blocks, code).not.toMatch(banned);
    }
  });

  it('produces variation across calls', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) codes.add(generateGiftCode());
    // 31^8 = 852_891_037_441 combinations → 50 calls colliding has prob ≈ 0
    expect(codes.size).toBe(50);
  });

  it('honors injected RNG (deterministic)', () => {
    let i = 0;
    const seq = [0.0, 0.5, 0.99, 0.25, 0.7, 0.1, 0.95, 0.4];
    const fakeRand = () => seq[i++ % seq.length] ?? 0;
    const a = generateGiftCode(fakeRand);
    i = 0;
    const b = generateGiftCode(fakeRand);
    expect(a).toBe(b);
  });
});
