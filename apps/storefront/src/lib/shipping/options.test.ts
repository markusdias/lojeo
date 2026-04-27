import { describe, it, expect } from 'vitest';
import { buildShippingOptions, quoteToOption, defaultFromCountry, defaultToCountry } from './options';
import type { ShippingQuote } from './international';

describe('defaultFromCountry / defaultToCountry', () => {
  it('BRL → BR', () => {
    expect(defaultFromCountry('BRL')).toBe('BR');
    expect(defaultToCountry('BRL')).toBe('BR');
  });

  it('USD/CAD → US', () => {
    expect(defaultFromCountry('USD')).toBe('US');
    expect(defaultFromCountry('CAD')).toBe('US');
  });

  it('GBP → GB', () => {
    expect(defaultFromCountry('GBP')).toBe('GB');
  });

  it('EUR → DE (generic Eurozone)', () => {
    expect(defaultFromCountry('EUR')).toBe('DE');
  });
});

describe('quoteToOption', () => {
  it('mapeia DHL Express', () => {
    const q: ShippingQuote = {
      carrier: 'dhl',
      service: 'Express Worldwide',
      amountCents: 5000,
      currency: 'USD',
      deliveryDaysMin: 2,
      deliveryDaysMax: 4,
      source: 'mock',
    };
    const opt = quoteToOption(q);
    expect(opt.carrier).toBe('DHL');
    expect(opt.id).toBe('dhl-express-worldwide');
    expect(opt.priceCents).toBe(5000);
    expect(opt.deadlineDays).toBe(4);
    expect(opt.label).toContain('2–4');
  });

  it('mapeia FedEx Priority', () => {
    const q: ShippingQuote = {
      carrier: 'fedex',
      service: 'International Priority',
      amountCents: 4500,
      currency: 'USD',
      deliveryDaysMin: 2,
      deliveryDaysMax: 5,
      source: 'mock',
    };
    const opt = quoteToOption(q);
    expect(opt.carrier).toBe('FedEx');
    expect(opt.id).toBe('fedex-international-priority');
  });
});

describe('buildShippingOptions', () => {
  it('BR retorna 3 opções domésticas (Correios PAC/SEDEX + Jadlog)', async () => {
    const opts = await buildShippingOptions({
      country: 'BR',
      postalCode: '01310-100',
      subtotalCents: 30000,
      currency: 'BRL',
    });
    expect(opts).toHaveLength(3);
    expect(opts.map((o) => o.id)).toEqual([
      'correios-pac',
      'correios-sedex',
      'jadlog-package',
    ]);
  });

  it('BR free shipping acima de R$500', async () => {
    const opts = await buildShippingOptions({
      country: 'BR',
      postalCode: '01310-100',
      subtotalCents: 60000,
      currency: 'BRL',
    });
    expect(opts.every((o) => o.priceCents === 0)).toBe(true);
  });

  it('US retorna quotes intl (DHL + FedEx + Correios Intl mock)', async () => {
    const opts = await buildShippingOptions({
      country: 'US',
      postalCode: '90210',
      subtotalCents: 30000,
      currency: 'USD',
    });
    expect(opts.length).toBeGreaterThanOrEqual(3);
    const carriers = new Set(opts.map((o) => o.carrier));
    expect(carriers.has('DHL')).toBe(true);
    expect(carriers.has('FedEx')).toBe(true);
  });

  it('GB EUR retorna intl quotes', async () => {
    const opts = await buildShippingOptions({
      country: 'GB',
      postalCode: 'SW1A 1AA',
      subtotalCents: 30000,
      currency: 'GBP',
    });
    expect(opts.length).toBeGreaterThan(0);
  });

  it('country undefined default BR', async () => {
    const opts = await buildShippingOptions({
      country: '',
      postalCode: '01310',
      subtotalCents: 30000,
      currency: 'BRL',
    });
    expect(opts).toHaveLength(3);
  });
});
