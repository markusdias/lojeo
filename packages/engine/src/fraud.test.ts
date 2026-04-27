import { describe, it, expect } from 'vitest';
import { computeFraudScore, isDisposableEmail, isPhoneSuspicious } from './fraud';

const baseSignals = {
  newEmail: false,
  orderTotalCents: 5000,
  ordersLast24h: 0,
  ordersAllTime: 5,
};

describe('computeFraudScore', () => {
  it('cliente recorrente ordem normal → score baixo + approve', () => {
    const r = computeFraudScore(baseSignals);
    expect(r.score).toBeLessThan(25);
    expect(r.level).toBe('low');
    expect(r.recommendation).toBe('approve');
  });

  it('cliente novo email + valor normal → +10 points', () => {
    const r = computeFraudScore({ ...baseSignals, newEmail: true });
    const newEmailSig = r.signals.find((s) => s.name === 'new_email');
    expect(newEmailSig?.points).toBe(10);
  });

  it('valor muito alto (R$5000+) → +25 points', () => {
    const r = computeFraudScore({ ...baseSignals, orderTotalCents: 600000 });
    const sig = r.signals.find((s) => s.name === 'very_high_value');
    expect(sig?.points).toBe(25);
  });

  it('valor alto R$2000+ → +12 points (não soma very_high)', () => {
    const r = computeFraudScore({ ...baseSignals, orderTotalCents: 250000 });
    expect(r.signals.find((s) => s.name === 'high_value')).toBeDefined();
    expect(r.signals.find((s) => s.name === 'very_high_value')).toBeUndefined();
  });

  it('velocity 3+ pedidos 24h → +20 points', () => {
    const r = computeFraudScore({ ...baseSignals, ordersLast24h: 3 });
    expect(r.signals.find((s) => s.name === 'velocity_24h')?.points).toBe(20);
  });

  it('first_order_high_value combo: novo email + zero histórico + R$2000+', () => {
    const r = computeFraudScore({
      ...baseSignals,
      newEmail: true,
      ordersAllTime: 0,
      orderTotalCents: 250000,
    });
    expect(r.signals.find((s) => s.name === 'first_order_high_value')?.points).toBe(15);
  });

  it('IP VPN/proxy → +22 points', () => {
    const r = computeFraudScore({ ...baseSignals, ipFromVpnOrProxy: true });
    expect(r.signals.find((s) => s.name === 'ip_vpn_or_proxy')?.points).toBe(22);
  });

  it('email disposable → +30 points (sinal forte)', () => {
    const r = computeFraudScore({ ...baseSignals, emailIsDisposable: true });
    expect(r.signals.find((s) => s.name === 'email_disposable')?.points).toBe(30);
  });

  it('combo high → score >= 50 → review', () => {
    const r = computeFraudScore({
      newEmail: true,
      orderTotalCents: 600000,
      ordersLast24h: 0,
      ordersAllTime: 0,
      ipCountryMismatch: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(50);
    expect(r.recommendation).toBe('review');
  });

  it('combo critical → score >= 80 → block', () => {
    const r = computeFraudScore({
      newEmail: true,
      orderTotalCents: 600000,
      ordersLast24h: 5,
      ordersAllTime: 0,
      ipCountryMismatch: true,
      ipFromVpnOrProxy: true,
      emailIsDisposable: true,
      billingShippingMismatch: true,
    });
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.recommendation).toBe('block');
  });

  it('score capped em 100', () => {
    const r = computeFraudScore({
      newEmail: true,
      orderTotalCents: 999999,
      aggressiveCouponDiscountBps: 5000,
      ordersLast24h: 10,
      ordersAllTime: 0,
      ipCountryMismatch: true,
      ipFromVpnOrProxy: true,
      emailIsDisposable: true,
      phoneSuspicious: true,
      billingShippingMismatch: true,
    });
    expect(r.score).toBe(100);
  });
});

describe('isDisposableEmail', () => {
  it('detecta dominios conhecidos', () => {
    expect(isDisposableEmail('foo@mailinator.com')).toBe(true);
    expect(isDisposableEmail('foo@yopmail.com')).toBe(true);
    expect(isDisposableEmail('FOO@TEMPMAIL.COM')).toBe(true); // case-insensitive
  });

  it('domínios reais retornam false', () => {
    expect(isDisposableEmail('foo@gmail.com')).toBe(false);
    expect(isDisposableEmail('foo@example.com')).toBe(false);
  });

  it('email malformado retorna false', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
  });
});

describe('isPhoneSuspicious', () => {
  it('phone null/undefined → false', () => {
    expect(isPhoneSuspicious(null)).toBe(false);
    expect(isPhoneSuspicious(undefined)).toBe(false);
  });

  it('< 8 digits → suspicious', () => {
    expect(isPhoneSuspicious('1234567')).toBe(true);
  });

  it('todos digits iguais → suspicious', () => {
    expect(isPhoneSuspicious('1111111111')).toBe(true);
    expect(isPhoneSuspicious('9999999999')).toBe(true);
  });

  it('sequência 12345678 → suspicious', () => {
    expect(isPhoneSuspicious('12345678')).toBe(true);
    expect(isPhoneSuspicious('87654321')).toBe(true);
  });

  it('phone real BR → não suspicious', () => {
    expect(isPhoneSuspicious('+55 (11) 91234-5678')).toBe(false);
    expect(isPhoneSuspicious('11912345678')).toBe(false);
  });
});
