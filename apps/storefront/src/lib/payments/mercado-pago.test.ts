import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isMercadoPagoConfigured,
  createMercadoPagoPreference,
  createMercadoPagoPixPayment,
  createMercadoPagoBoletoPayment,
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

  describe('createMercadoPagoPixPayment', () => {
    const sampleInput = {
      orderId: 'order-pix-1',
      orderNumber: 'LJ-PIX-1',
      totalCents: 5000,
      payerEmail: 'cliente@example.com',
      payerName: 'João Silva',
    };

    it('retorna mock pix sem token', async () => {
      const result = await createMercadoPagoPixPayment(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.qrCode).toContain('MOCK-PIX');
      expect(result.qrCodeBase64).toBe('');
      expect(result.paymentId).toContain('mock-pix-');
    });

    it('chama API real com idempotency key + retorna QR data', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      let capturedHeaders: Record<string, string> = {};
      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response(JSON.stringify({
          id: 12345,
          status: 'pending',
          point_of_interaction: {
            transaction_data: {
              qr_code: '00020126580014BR.GOV.BCB.PIX',
              qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAA',
              ticket_url: 'https://www.mercadopago.com.br/payments/12345/ticket',
            },
          },
        }), { status: 200 });
      }) as typeof fetch;

      const result = await createMercadoPagoPixPayment(sampleInput);
      expect(result.source).toBe('mp');
      expect(result.paymentId).toBe('12345');
      expect(result.qrCode).toContain('BR.GOV.BCB.PIX');
      expect(result.qrCodeBase64).toContain('iVBORw');
      expect(result.ticketUrl).toContain('mercadopago.com.br');
      expect(capturedHeaders['x-idempotency-key']).toBe('order-pix-1');
    });

    it('cai para mock se API falha', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      global.fetch = (async () => new Response('error', { status: 500 })) as typeof fetch;
      const result = await createMercadoPagoPixPayment(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.paymentId).toContain('mock-pix-fallback');
    });
  });

  describe('createMercadoPagoBoletoPayment', () => {
    const sampleInput = {
      orderId: 'order-bol-1',
      orderNumber: 'LJ-BOL-1',
      totalCents: 5000,
      payerEmail: 'cliente@example.com',
      payerName: 'João Silva',
      payerCpf: '123.456.789-09',
    };

    it('retorna mock boleto sem token', async () => {
      const result = await createMercadoPagoBoletoPayment(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.boletoUrl).toBe('');
      expect(result.barcode).toContain('MOCK-BOLETO');
      expect(result.paymentId).toContain('mock-bol-');
    });

    it('chama API real com identification CPF + idempotency-key', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody = '';
      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedHeaders = init?.headers as Record<string, string>;
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({
          id: 'pay-boleto-99',
          status: 'pending',
          transaction_details: {
            external_resource_url: 'https://www.mercadopago.com.br/payments/99/ticket',
          },
          barcode: { content: '23793.39001 60000.000000 12345.678905 1 99990000005000' },
        }), { status: 200 });
      }) as typeof fetch;

      const result = await createMercadoPagoBoletoPayment(sampleInput);
      expect(result.source).toBe('mp');
      expect(result.paymentId).toBe('pay-boleto-99');
      expect(result.boletoUrl).toContain('mercadopago.com.br');
      expect(result.barcode).toContain('23793.39001');
      expect(capturedHeaders['x-idempotency-key']).toBe('boleto-order-bol-1');
      const parsed = JSON.parse(capturedBody) as {
        payment_method_id: string;
        payer: { identification?: { type: string; number: string } };
      };
      expect(parsed.payment_method_id).toBe('bolbradesco');
      expect(parsed.payer.identification?.type).toBe('CPF');
      expect(parsed.payer.identification?.number).toBe('12345678909');
    });

    it('skip identification se CPF incompleto', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      let capturedBody = '';
      global.fetch = (async (_url: string, init?: RequestInit) => {
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({ id: 1, transaction_details: {}, barcode: {} }), { status: 200 });
      }) as typeof fetch;

      await createMercadoPagoBoletoPayment({ ...sampleInput, payerCpf: '123' });
      const parsed = JSON.parse(capturedBody) as { payer: { identification?: unknown } };
      expect(parsed.payer.identification).toBeUndefined();
    });

    it('cai para mock se API falha', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-fake';
      global.fetch = (async () => new Response('error', { status: 500 })) as typeof fetch;
      const result = await createMercadoPagoBoletoPayment(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.paymentId).toContain('mock-bol-fallback');
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
