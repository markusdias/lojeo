import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isAnyShippingCarrierConfigured,
  getMockShippingQuotes,
  getInternationalShippingQuotes,
} from './international';

describe('international shipping', () => {
  const originalDhl = process.env.DHL_API_KEY;
  const originalFedex = process.env.FEDEX_API_KEY;

  beforeEach(() => {
    delete process.env.DHL_API_KEY;
    delete process.env.FEDEX_API_KEY;
  });

  afterEach(() => {
    if (originalDhl !== undefined) process.env.DHL_API_KEY = originalDhl;
    if (originalFedex !== undefined) process.env.FEDEX_API_KEY = originalFedex;
  });

  const sampleInput = {
    fromCountry: 'US',
    toCountry: 'BR',
    toPostalCode: '01000-000',
    weightG: 500,
    currency: 'USD' as const,
  };

  describe('isAnyShippingCarrierConfigured', () => {
    it('false sem env', () => {
      expect(isAnyShippingCarrierConfigured()).toBe(false);
    });
    it('true com DHL', () => {
      process.env.DHL_API_KEY = 'k';
      expect(isAnyShippingCarrierConfigured()).toBe(true);
    });
    it('true com FedEx', () => {
      process.env.FEDEX_API_KEY = 'k';
      expect(isAnyShippingCarrierConfigured()).toBe(true);
    });
  });

  describe('getMockShippingQuotes', () => {
    it('retorna 4 opções (DHL, FedEx Priority, FedEx Economy, Correios)', () => {
      const quotes = getMockShippingQuotes(sampleInput);
      expect(quotes).toHaveLength(4);
      const carriers = quotes.map((q) => q.carrier);
      expect(carriers).toContain('dhl');
      expect(carriers).toContain('fedex');
      expect(carriers).toContain('correios_intl');
    });

    it('todos quotes mock', () => {
      const quotes = getMockShippingQuotes(sampleInput);
      quotes.forEach((q) => expect(q.source).toBe('mock'));
    });

    it('preserva currency input', () => {
      const quotes = getMockShippingQuotes({ ...sampleInput, currency: 'EUR' });
      quotes.forEach((q) => expect(q.currency).toBe('EUR'));
    });

    it('peso maior aumenta amountCents', () => {
      const lower = getMockShippingQuotes({ ...sampleInput, weightG: 100 });
      const higher = getMockShippingQuotes({ ...sampleInput, weightG: 5000 });
      expect(higher[0]!.amountCents).toBeGreaterThan(lower[0]!.amountCents);
    });

    it('mesmo país (doméstico) é mais barato que internacional', () => {
      const intl = getMockShippingQuotes({ ...sampleInput, fromCountry: 'US', toCountry: 'BR' });
      const domestic = getMockShippingQuotes({ ...sampleInput, fromCountry: 'US', toCountry: 'US' });
      expect(domestic[0]!.amountCents).toBeLessThan(intl[0]!.amountCents);
    });

    it('cross-region (US→JP) > same-region (US→CA)', () => {
      const cross = getMockShippingQuotes({ ...sampleInput, fromCountry: 'US', toCountry: 'JP' });
      const sameRegion = getMockShippingQuotes({ ...sampleInput, fromCountry: 'US', toCountry: 'CA' });
      expect(cross[0]!.amountCents).toBeGreaterThan(sameRegion[0]!.amountCents);
    });

    it('DHL é mais rápido que Correios Intl', () => {
      const quotes = getMockShippingQuotes(sampleInput);
      const dhl = quotes.find((q) => q.carrier === 'dhl');
      const correios = quotes.find((q) => q.carrier === 'correios_intl');
      expect(dhl!.deliveryDaysMax).toBeLessThan(correios!.deliveryDaysMax);
    });
  });

  describe('getInternationalShippingQuotes', () => {
    it('fallback pra mock quando sem creds', async () => {
      const quotes = await getInternationalShippingQuotes(sampleInput);
      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes.every((q) => q.source === 'mock')).toBe(true);
    });
  });
});
