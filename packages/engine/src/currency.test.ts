import { describe, it, expect } from 'vitest';
import { formatMoney, fmtBRL, fmtUSD, asSupportedCurrency } from './currency';

describe('currency formatter', () => {
  describe('formatMoney BRL', () => {
    it('formata cents em pt-BR', () => {
      const out = formatMoney(277690, 'BRL');
      // pt-BR: R$ 2.776,90 (separador milhares . , decimal ,)
      expect(out).toMatch(/R\$/);
      expect(out).toMatch(/2[\s.]?776,90/);
    });
    it('zero', () => {
      expect(formatMoney(0, 'BRL')).toMatch(/R\$/);
      expect(formatMoney(0, 'BRL')).toMatch(/0,00/);
    });
  });

  describe('formatMoney USD', () => {
    it('formata cents em en-US', () => {
      const out = formatMoney(2999, 'USD');
      // en-US: $29.99
      expect(out).toMatch(/\$/);
      expect(out).toMatch(/29\.99/);
    });
    it('thousands separator', () => {
      const out = formatMoney(123456, 'USD');
      expect(out).toMatch(/1,234\.56/);
    });
  });

  describe('formatMoney EUR', () => {
    it('aceita EUR sem locale specific', () => {
      const out = formatMoney(5000, 'EUR');
      expect(out).toMatch(/€|EUR/);
    });
  });

  describe('helpers atalho', () => {
    it('fmtBRL', () => {
      expect(fmtBRL(10000)).toMatch(/R\$/);
    });
    it('fmtUSD', () => {
      expect(fmtUSD(10000)).toMatch(/\$/);
    });
  });

  describe('asSupportedCurrency', () => {
    it('aceita BRL/USD/EUR/GBP/CAD case insensitive', () => {
      expect(asSupportedCurrency('brl')).toBe('BRL');
      expect(asSupportedCurrency('USD')).toBe('USD');
      expect(asSupportedCurrency('eur')).toBe('EUR');
    });
    it('fallback BRL pra moeda desconhecida', () => {
      expect(asSupportedCurrency('JPY')).toBe('BRL');
      expect(asSupportedCurrency('xpto')).toBe('BRL');
    });
  });
});
