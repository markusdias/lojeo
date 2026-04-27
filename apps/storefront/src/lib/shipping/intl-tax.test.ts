import { describe, it, expect } from 'vitest';
import { estimateIntlTax, intlTaxNoticeCopy } from './intl-tax';

describe('estimateIntlTax', () => {
  it('domestico (BR→BR) retorna noticeKey=none e estimatedCents=0', () => {
    const e = estimateIntlTax({ toCountry: 'BR', fromCountry: 'BR', subtotalCents: 30000, shippingCents: 1500 });
    expect(e.noticeKey).toBe('none');
    expect(e.estimatedCents).toBe(0);
    expect(e.taxKind).toBe('none');
  });

  it('US→DE aplica VAT 19%', () => {
    const e = estimateIntlTax({ toCountry: 'DE', fromCountry: 'US', subtotalCents: 10000, shippingCents: 0 });
    expect(e.taxKind).toBe('vat');
    expect(e.rateBps).toBe(1900);
    expect(e.estimatedCents).toBe(1900); // 10000 * 0.19
    expect(e.noticeKey).toBe('vat_destination');
  });

  it('US→GB VAT 20%', () => {
    const e = estimateIntlTax({ toCountry: 'GB', fromCountry: 'US', subtotalCents: 5000, shippingCents: 1000 });
    expect(e.rateBps).toBe(2000);
    expect(e.estimatedCents).toBe(1200); // 6000 * 0.20
  });

  it('US→US sales tax 7%', () => {
    const e = estimateIntlTax({ toCountry: 'US', fromCountry: 'US', subtotalCents: 10000, shippingCents: 0 });
    // domestico → none
    expect(e.noticeKey).toBe('none');
  });

  it('CA→US sales tax 7% (cross-border)', () => {
    const e = estimateIntlTax({ toCountry: 'US', fromCountry: 'CA', subtotalCents: 10000, shippingCents: 0 });
    expect(e.taxKind).toBe('sales_tax');
    expect(e.rateBps).toBe(700);
    expect(e.estimatedCents).toBe(700);
    expect(e.noticeKey).toBe('sales_tax_state');
  });

  it('US→BR customs 60%', () => {
    const e = estimateIntlTax({ toCountry: 'BR', fromCountry: 'US', subtotalCents: 10000, shippingCents: 5000 });
    expect(e.taxKind).toBe('customs');
    expect(e.rateBps).toBe(6000);
    expect(e.estimatedCents).toBe(9000); // 15000 * 0.60
  });

  it('pais nao listado retorna noticeKey=customs_destination com 0 cents', () => {
    const e = estimateIntlTax({ toCountry: 'JP', fromCountry: 'US', subtotalCents: 10000, shippingCents: 0 });
    expect(e.noticeKey).toBe('customs_destination');
    expect(e.estimatedCents).toBe(0);
  });
});

describe('intlTaxNoticeCopy', () => {
  it('en-US VAT destination copy', () => {
    const c = intlTaxNoticeCopy({
      toCountry: 'DE', taxKind: 'vat', rateBps: 1900, estimatedCents: 1900,
      noticeKey: 'vat_destination', locale: 'en-US',
    });
    expect(c.title).toContain('VAT');
    expect(c.body).toContain('VAT');
  });

  it('pt-BR customs copy', () => {
    const c = intlTaxNoticeCopy({
      toCountry: 'BR', taxKind: 'customs', rateBps: 6000, estimatedCents: 9000,
      noticeKey: 'customs_destination', locale: 'pt-BR',
    });
    expect(c.title).toContain('alfandegárias');
  });

  it('noticeKey=none retorna title vazio', () => {
    const c = intlTaxNoticeCopy({
      toCountry: 'BR', taxKind: 'none', rateBps: 0, estimatedCents: 0,
      noticeKey: 'none', locale: 'en-US',
    });
    expect(c.title).toBe('');
    expect(c.body).toBe('');
  });
});
