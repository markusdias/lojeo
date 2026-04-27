import { describe, it, expect } from 'vitest';
import { coffeeV1 } from './index';

describe('coffee-v1 template', () => {
  it('id e nome', () => {
    expect(coffeeV1.id).toBe('coffee-v1');
    expect(coffeeV1.name).toContain('Coffee');
  });
  it('locale + currency internacional', () => {
    expect(coffeeV1.locale).toBe('en-US');
    expect(coffeeV1.currency).toBe('USD');
  });
  it('fields essenciais (origin, process, roast)', () => {
    expect(coffeeV1.fields?.origin).toBeDefined();
    expect(coffeeV1.fields?.process).toBeDefined();
    expect(coffeeV1.fields?.roast).toBeDefined();
    expect(coffeeV1.fields?.origin?.required).toBe(true);
    expect(coffeeV1.fields?.process?.required).toBe(true);
    expect(coffeeV1.fields?.roast?.required).toBe(true);
  });
  it('typography 3 combos', () => {
    expect(coffeeV1.typography?.combos).toHaveLength(3);
    expect(coffeeV1.typography?.default).toBe('editorial-warm');
  });
  it('palette espresso/caramel', () => {
    expect(coffeeV1.palette?.accent).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
