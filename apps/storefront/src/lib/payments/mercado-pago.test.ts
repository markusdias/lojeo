import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isMercadoPagoConfigured,
  createMercadoPagoPreference,
  mpStatusToOrderStatus,
  fetchMercadoPagoPayment,
} from './mercado-pago';

describe('mercado-pago helper', () => {
  const originalToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
  });

  afterEach(() => {
    if (originalToken !== undefined) process.env.MERCADO_PAGO_ACCESS_TOKEN = originalToken;
    global.fetch = originalFetch;
  });

  describe('isMercadoPagoConfigured', () => {
    it('false sem token', () => {
      expect(isMercadoPagoConfigured()).toBe(false);
    });
    it('true com token', () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      expect(isMercadoPagoConfigured()).toBe(true);
    });
  });

  describe('createMercadoPagoPreference', () => {
    it('retorna mock preference sem token', async () => {
      const result = await createMercadoPagoPreference({
        orderId: 'order-123',
        orderNumber: 'LJ-00001',
        totalCents: 5000,
        items: [{ title: 'Anel', quantity: 1, unit_price: 50, currency_id: 'BRL' }],
      });
      expect(result.source).toBe('mock');
      expect(result.id).toContain('mock-');
      expect(result.id).toContain('order-123');
    });

    it('chama API real quando token presente', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody = '';
      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>;
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({
          id: 'pref-real-1',
          init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-real-1',
          sandbox_init_point: 'https://sandbox.mercadopago.com.br/x',
        }), { status: 200 });
      }) as typeof fetch;

      const result = await createMercadoPagoPreference({
        orderId: 'order-456',
        orderNumber: 'LJ-00002',
        totalCents: 10000,
        items: [{ title: 'Brinco', quantity: 2, unit_price: 50, currency_id: 'BRL' }],
        payerEmail: 'cliente@example.com',
      });

      expect(result.source).toBe('mp');
      expect(result.id).toBe('pref-real-1');
      expect(result.initPoint).toContain('mercadopago.com.br');
      expect(capturedHeaders.authorization).toBe('Bearer APP_USR-fake');
      const parsed = JSON.parse(capturedBody) as { external_reference: string; payer: { email: string } };
      expect(parsed.external_reference).toBe('order-456');
      expect(parsed.payer.email).toBe('cliente@example.com');
    });

    it('cai para mock se API falha', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      global.fetch = (async () => new Response('error', { status: 500 })) as typeof fetch;

      const result = await createMercadoPagoPreference({
        orderId: 'order-789',
        orderNumber: 'LJ-00003',
        totalCents: 5000,
        items: [{ title: 'Colar', quantity: 1, unit_price: 50, currency_id: 'BRL' }],
      });
      expect(result.source).toBe('mock');
      expect(result.id).toContain('mock-fallback-');
    });
  });

  describe('mpStatusToOrderStatus', () => {
    it('approved → paid', () => {
      expect(mpStatusToOrderStatus('approved')).toBe('paid');
    });
    it('authorized → paid', () => {
      expect(mpStatusToOrderStatus('authorized')).toBe('paid');
    });
    it('rejected → cancelled', () => {
      expect(mpStatusToOrderStatus('rejected')).toBe('cancelled');
    });
    it('cancelled → cancelled', () => {
      expect(mpStatusToOrderStatus('cancelled')).toBe('cancelled');
    });
    it('pending → pending', () => {
      expect(mpStatusToOrderStatus('pending')).toBe('pending');
    });
    it('in_process → pending', () => {
      expect(mpStatusToOrderStatus('in_process')).toBe('pending');
    });
  });

  describe('fetchMercadoPagoPayment', () => {
    it('retorna null sem token', async () => {
      const result = await fetchMercadoPagoPayment('payment-123');
      expect(result).toBeNull();
    });
    it('retorna payment data com token', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      global.fetch = (async () => new Response(JSON.stringify({
        id: 'payment-123',
        status: 'approved',
        status_detail: 'accredited',
        external_reference: 'order-1',
        transaction_amount: 100,
        payment_method_id: 'pix',
        payment_type_id: 'bank_transfer',
      }), { status: 200 })) as typeof fetch;
      const result = await fetchMercadoPagoPayment('payment-123');
      expect(result?.status).toBe('approved');
      expect(result?.external_reference).toBe('order-1');
    });
    it('retorna null se API falha', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      global.fetch = (async () => new Response('error', { status: 500 })) as typeof fetch;
      const result = await fetchMercadoPagoPayment('payment-123');
      expect(result).toBeNull();
    });
  });
});
