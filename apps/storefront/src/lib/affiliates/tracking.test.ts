import { describe, it, expect } from 'vitest';
import {
  parseAffiliateCookie,
  isCookieValid,
  buildAffiliateCookieValue,
  buildAffiliateSetCookieHeader,
  extractAffiliateRefFromUrl,
  computeAffiliateCommissionCents,
} from './tracking';

describe('parseAffiliateCookie', () => {
  it('null/empty → code=null', () => {
    expect(parseAffiliateCookie(null).code).toBeNull();
    expect(parseAffiliateCookie('').code).toBeNull();
  });

  it('cookie ausente → null', () => {
    expect(parseAffiliateCookie('other=value; foo=bar').code).toBeNull();
  });

  it('formato correto CODE.timestamp', () => {
    const ts = 1700000000000;
    const parsed = parseAffiliateCookie(`lojeo_aff=ABC123.${ts}; other=x`);
    expect(parsed.code).toBe('ABC123');
    expect(parsed.setAt?.getTime()).toBe(ts);
  });

  it('formato inválido → null', () => {
    expect(parseAffiliateCookie('lojeo_aff=ABC123').code).toBeNull();
    expect(parseAffiliateCookie('lojeo_aff=ABC123.notanumber').code).toBeNull();
  });
});

describe('isCookieValid', () => {
  it('cookie recente válido', () => {
    const recent = new Date(Date.now() - 60 * 1000);
    expect(isCookieValid({ code: 'ABC', setAt: recent })).toBe(true);
  });

  it('cookie > 30 dias inválido', () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(isCookieValid({ code: 'ABC', setAt: old })).toBe(false);
  });

  it('null fields → inválido', () => {
    expect(isCookieValid({ code: null, setAt: null })).toBe(false);
  });
});

describe('buildAffiliateCookieValue', () => {
  it('uppercase + sanitiza', () => {
    const v = buildAffiliateCookieValue('abc-123');
    expect(v.startsWith('ABC-123.')).toBe(true);
  });

  it('strip caracteres especiais', () => {
    const v = buildAffiliateCookieValue('foo<script>alert</script>');
    expect(v.startsWith('FOOSCRIPTALERTSCRIPT.')).toBe(true);
  });

  it('vazio quando código só de caracteres especiais', () => {
    expect(buildAffiliateCookieValue('@#$%')).toBe('');
  });
});

describe('buildAffiliateSetCookieHeader', () => {
  it('inclui Max-Age 30d', () => {
    const h = buildAffiliateSetCookieHeader('ABC');
    expect(h).toContain('lojeo_aff=');
    expect(h).toContain('Max-Age=2592000'); // 30 * 24 * 3600
    expect(h).toContain('Path=/');
    expect(h).toContain('SameSite=Lax');
  });

  it('código vazio retorna vazio', () => {
    expect(buildAffiliateSetCookieHeader('@#')).toBe('');
  });
});

describe('extractAffiliateRefFromUrl', () => {
  it('captura ref param', () => {
    expect(extractAffiliateRefFromUrl('https://shop.com/?ref=ABC123')).toBe('ABC123');
  });

  it('lowercase → uppercase', () => {
    expect(extractAffiliateRefFromUrl('https://shop.com/?ref=abc-xyz')).toBe('ABC-XYZ');
  });

  it('sem ref → null', () => {
    expect(extractAffiliateRefFromUrl('https://shop.com/')).toBeNull();
  });

  it('URL inválida → null', () => {
    expect(extractAffiliateRefFromUrl('not-a-url')).toBeNull();
  });
});

describe('computeAffiliateCommissionCents', () => {
  it('10% de R$100 = R$10', () => {
    expect(computeAffiliateCommissionCents(10000, 1000)).toBe(1000);
  });

  it('15% de R$250 = R$37.50', () => {
    expect(computeAffiliateCommissionCents(25000, 1500)).toBe(3750);
  });

  it('zero ou negativo retorna 0', () => {
    expect(computeAffiliateCommissionCents(0, 1000)).toBe(0);
    expect(computeAffiliateCommissionCents(-100, 1000)).toBe(0);
    expect(computeAffiliateCommissionCents(10000, 0)).toBe(0);
  });

  it('floor (não arredonda pra cima)', () => {
    expect(computeAffiliateCommissionCents(99, 1000)).toBe(9); // 9.9 → 9
  });
});
