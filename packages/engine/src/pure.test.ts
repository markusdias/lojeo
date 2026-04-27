import { describe, it, expect } from 'vitest';
import * as pure from './pure';

describe('engine /pure subpath', () => {
  it('exports helpers puros sem dependência DB', () => {
    expect(typeof pure.computeFraudScore).toBe('function');
    expect(typeof pure.formatMoney).toBe('function');
    expect(typeof pure.fmtBRL).toBe('function');
    expect(typeof pure.cohortRetention).toBe('function');
    expect(typeof pure.bestSendHour).toBe('function');
    expect(typeof pure.computeNps).toBe('function');
    expect(typeof pure.scoreChurnBatch).toBe('function');
    expect(typeof pure.computeWarranty).toBe('function');
    expect(typeof pure.scoreCustomers).toBe('function');
    expect(typeof pure.computeAttribution).toBe('function');
    expect(typeof pure.renderMarkdown).toBe('function');
    expect(typeof pure.isValidCpf).toBe('function');
    expect(typeof pure.formatCpf).toBe('function');
    expect(typeof pure.asSupportedCurrency).toBe('function');
  });

  it('NÃO exporta helpers server-only (tenant/inventory db)', () => {
    // Estes existem no main barrel mas não em /pure:
    expect((pure as Record<string, unknown>).getTenantById).toBeUndefined();
    expect((pure as Record<string, unknown>).getInventoryStock).toBeUndefined();
  });

  it('formatMoney smoke', () => {
    expect(pure.formatMoney(1000, 'BRL')).toMatch(/R\$\s*10[.,]00/);
  });

  it('computeFraudScore smoke', () => {
    const r = pure.computeFraudScore({
      newEmail: false,
      orderTotalCents: 1000,
      ordersLast24h: 0,
      ordersAllTime: 5,
    });
    expect(r.recommendation).toBe('approve');
  });
});
