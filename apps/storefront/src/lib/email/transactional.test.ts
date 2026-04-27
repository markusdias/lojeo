import { describe, it, expect, beforeEach, vi } from 'vitest';

let lastSendCall: { subject?: string; to?: string | string[]; htmlLength?: number } | null = null;
let mockDelivered = true;

vi.mock('@lojeo/email', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    sendEmail: vi.fn(async (input: { subject: string; to: string | string[]; html: string }) => {
      lastSendCall = { subject: input.subject, to: input.to, htmlLength: input.html.length };
      return { id: 'mock-1', delivered: mockDelivered };
    }),
  };
});

import { sendOrderConfirmationEmail, sendWelcomeEmail } from './transactional';

describe('transactional emails (storefront)', () => {
  beforeEach(() => {
    lastSendCall = null;
    mockDelivered = true;
  });

  describe('sendOrderConfirmationEmail', () => {
    it('skip se sem customerEmail', async () => {
      const result = await sendOrderConfirmationEmail({
        storeName: 'Atelier',
        customerName: 'João',
        customerEmail: '',
        orderCode: 'LJ-1',
        items: [],
        subtotalCents: 0,
        shippingCents: 0,
        shippingLabel: 'Frete',
        totalCents: 0,
        storeBaseUrl: 'https://x',
        orderId: 'o1',
      });
      expect(result.ok).toBe(false);
      expect(lastSendCall).toBeNull();
    });

    it('chama sendEmail com subject correto', async () => {
      const result = await sendOrderConfirmationEmail({
        storeName: 'Atelier',
        customerName: 'João',
        customerEmail: 'joao@example.com',
        orderCode: 'LJ-00042',
        items: [{ name: 'Anel', detail: 'ouro', price: 'R$ 100,00' }],
        subtotalCents: 10000,
        shippingCents: 1500,
        shippingLabel: 'Frete (Sedex)',
        totalCents: 11500,
        storeBaseUrl: 'https://lojeo.app',
        orderId: 'o-42',
      });
      expect(result.ok).toBe(true);
      expect(lastSendCall?.subject).toBe('Pedido confirmado · LJ-00042');
      expect(lastSendCall?.to).toBe('joao@example.com');
      expect(lastSendCall?.htmlLength).toBeGreaterThan(100);
    });

    it('retorna ok=false quando sendEmail falha', async () => {
      mockDelivered = false;
      const result = await sendOrderConfirmationEmail({
        storeName: 'Atelier',
        customerName: 'João',
        customerEmail: 'joao@example.com',
        orderCode: 'LJ-1',
        items: [],
        subtotalCents: 0,
        shippingCents: 0,
        shippingLabel: 'Frete',
        totalCents: 0,
        storeBaseUrl: 'https://x',
        orderId: 'o1',
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('sendWelcomeEmail', () => {
    it('skip se sem email', async () => {
      const result = await sendWelcomeEmail({ customerEmail: '', customerName: 'X' });
      expect(result.ok).toBe(false);
      expect(lastSendCall).toBeNull();
    });

    it('chama sendEmail com subject Bem-vinda', async () => {
      const result = await sendWelcomeEmail({
        customerEmail: 'maria@example.com',
        customerName: 'Maria',
      });
      expect(result.ok).toBe(true);
      expect(lastSendCall?.subject).toContain('Bem-vinda');
      expect(lastSendCall?.to).toBe('maria@example.com');
    });
  });
});
