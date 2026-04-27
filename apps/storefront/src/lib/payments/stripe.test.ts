import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isStripeConfigured,
  createStripePaymentIntent,
  stripeStatusToOrderStatus,
  verifyStripeSignature,
} from './stripe';

describe('stripe helper', () => {
  const originalToken = process.env.STRIPE_SECRET_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (originalToken !== undefined) process.env.STRIPE_SECRET_KEY = originalToken;
    global.fetch = originalFetch;
  });

  describe('isStripeConfigured', () => {
    it('false sem token', () => {
      expect(isStripeConfigured()).toBe(false);
    });
    it('true com token', () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_x';
      expect(isStripeConfigured()).toBe(true);
    });
  });

  describe('createStripePaymentIntent', () => {
    const sampleInput = {
      orderId: 'order-int-1',
      orderNumber: 'CF-00001',
      totalCents: 5000,
      currency: 'USD' as const,
      payerEmail: 'jane@example.com',
    };

    it('retorna mock sem token', async () => {
      const result = await createStripePaymentIntent(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.paymentIntentId).toContain('mock-pi-');
      expect(result.clientSecret).toContain('mock-pi-');
      expect(result.status).toBe('requires_payment_method');
    });

    it('chama Stripe API real com idempotency-key + form-encoded body', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_xyz';
      let capturedHeaders: Record<string, string> = {};
      let capturedBody = '';
      let capturedUrl = '';
      global.fetch = (async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedHeaders = init?.headers as Record<string, string>;
        capturedBody = init?.body as string;
        return new Response(JSON.stringify({
          id: 'pi_real_1',
          client_secret: 'pi_real_1_secret_xyz',
          status: 'requires_payment_method',
        }), { status: 200 });
      }) as typeof fetch;

      const result = await createStripePaymentIntent(sampleInput);
      expect(result.source).toBe('stripe');
      expect(result.paymentIntentId).toBe('pi_real_1');
      expect(result.clientSecret).toBe('pi_real_1_secret_xyz');
      expect(capturedUrl).toContain('/payment_intents');
      expect(capturedHeaders.authorization).toBe('Bearer sk_test_xyz');
      expect(capturedHeaders['idempotency-key']).toBe('pi-order-int-1');
      expect(capturedHeaders['content-type']).toBe('application/x-www-form-urlencoded');
      // amount em cents, currency lowercase, metadata bracket-notation
      expect(capturedBody).toContain('amount=5000');
      expect(capturedBody).toContain('currency=usd');
      expect(capturedBody).toContain('metadata%5Border_id%5D=order-int-1');
      expect(capturedBody).toContain('automatic_payment_methods%5Benabled%5D=true');
    });

    it('cai para mock se API falha', async () => {
      process.env.STRIPE_SECRET_KEY = 'sk_test_xyz';
      global.fetch = (async () => new Response('error', { status: 500 })) as typeof fetch;
      const result = await createStripePaymentIntent(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.paymentIntentId).toContain('mock-pi-fallback');
    });
  });

  describe('verifyStripeSignature', () => {
    const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

    afterEach(() => {
      if (originalSecret !== undefined) process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('aceita tudo em dev mode (sem env)', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const ok = await verifyStripeSignature('body', 't=1,v1=abc');
      expect(ok).toBe(true);
    });

    it('rejeita header ausente quando secret presente', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      expect(await verifyStripeSignature('body', null)).toBe(false);
    });

    it('rejeita header sem t/v1', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      expect(await verifyStripeSignature('body', 'invalid')).toBe(false);
    });

    it('rejeita signature errada', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
      expect(await verifyStripeSignature('body', 't=1,v1=ab')).toBe(false);
    });
  });

  describe('stripeStatusToOrderStatus', () => {
    it('succeeded → paid', () => {
      expect(stripeStatusToOrderStatus('succeeded')).toBe('paid');
    });
    it('canceled → cancelled', () => {
      expect(stripeStatusToOrderStatus('canceled')).toBe('cancelled');
    });
    it('requires_payment_method → pending', () => {
      expect(stripeStatusToOrderStatus('requires_payment_method')).toBe('pending');
    });
    it('processing → pending', () => {
      expect(stripeStatusToOrderStatus('processing')).toBe('pending');
    });
    it('unknown → pending', () => {
      expect(stripeStatusToOrderStatus('xpto')).toBe('pending');
    });
  });
});
