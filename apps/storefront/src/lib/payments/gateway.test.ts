import { describe, it, expect } from 'vitest';
import { selectGateway, isGatewayDecision, stripeCurrency } from './gateway';

describe('selectGateway', () => {
  it('BRL + pix → mercadopago', () => {
    const r = selectGateway('BRL', 'pix');
    expect(isGatewayDecision(r)).toBe(true);
    if (isGatewayDecision(r)) expect(r.gateway).toBe('mercadopago');
  });

  it('BRL + credit_card → mercadopago', () => {
    const r = selectGateway('BRL', 'credit_card');
    expect(isGatewayDecision(r)).toBe(true);
    if (isGatewayDecision(r)) expect(r.gateway).toBe('mercadopago');
  });

  it('BRL + boleto → mercadopago', () => {
    const r = selectGateway('BRL', 'boleto');
    expect(isGatewayDecision(r)).toBe(true);
    if (isGatewayDecision(r)) expect(r.gateway).toBe('mercadopago');
  });

  it('USD + credit_card → stripe', () => {
    const r = selectGateway('USD', 'credit_card');
    expect(isGatewayDecision(r)).toBe(true);
    if (isGatewayDecision(r)) expect(r.gateway).toBe('stripe');
  });

  it('EUR + credit_card → stripe', () => {
    const r = selectGateway('EUR', 'credit_card');
    expect(isGatewayDecision(r)).toBe(true);
    if (isGatewayDecision(r)) expect(r.gateway).toBe('stripe');
  });

  it('USD + pix → error (Pix BR-only)', () => {
    const r = selectGateway('USD', 'pix');
    expect(isGatewayDecision(r)).toBe(false);
    if (!isGatewayDecision(r)) {
      expect(r.error).toBe('invalid_payment_method_for_currency');
      expect(r.reason).toContain('Pix');
    }
  });

  it('USD + boleto → error', () => {
    const r = selectGateway('USD', 'boleto');
    expect(isGatewayDecision(r)).toBe(false);
  });

  it('GBP + credit_card → stripe', () => {
    const r = selectGateway('GBP', 'credit_card');
    if (isGatewayDecision(r)) expect(r.gateway).toBe('stripe');
  });
});

describe('stripeCurrency', () => {
  it('passa USD/EUR/GBP/CAD', () => {
    expect(stripeCurrency('USD')).toBe('USD');
    expect(stripeCurrency('EUR')).toBe('EUR');
    expect(stripeCurrency('GBP')).toBe('GBP');
    expect(stripeCurrency('CAD')).toBe('CAD');
  });

  it('throw em BRL (caso impossível)', () => {
    expect(() => stripeCurrency('BRL')).toThrow();
  });
});
