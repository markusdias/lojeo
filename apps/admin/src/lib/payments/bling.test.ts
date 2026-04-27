import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isBlingConfigured, createBlingNfe, __resetBlingTokenCache } from './bling';

describe('bling helper', () => {
  const originalId = process.env.BLING_CLIENT_ID;
  const originalSecret = process.env.BLING_CLIENT_SECRET;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.BLING_CLIENT_ID;
    delete process.env.BLING_CLIENT_SECRET;
    __resetBlingTokenCache();
  });

  afterEach(() => {
    if (originalId !== undefined) process.env.BLING_CLIENT_ID = originalId;
    if (originalSecret !== undefined) process.env.BLING_CLIENT_SECRET = originalSecret;
    global.fetch = originalFetch;
  });

  describe('isBlingConfigured', () => {
    it('false sem creds', () => {
      expect(isBlingConfigured()).toBe(false);
    });
    it('false com apenas client_id', () => {
      process.env.BLING_CLIENT_ID = 'xx';
      expect(isBlingConfigured()).toBe(false);
    });
    it('true com ambos', () => {
      process.env.BLING_CLIENT_ID = 'xx';
      process.env.BLING_CLIENT_SECRET = 'yy';
      expect(isBlingConfigured()).toBe(true);
    });
  });

  describe('createBlingNfe', () => {
    const sampleInput = {
      orderId: 'order-abc-123',
      orderNumber: 'LJ-00001',
      customerName: 'João Silva',
      customerEmail: 'joao@example.com',
      items: [{ description: 'Anel ouro', quantity: 1, unitPriceCents: 50000 }],
      totalCents: 50000,
      shippingCents: 1500,
    };

    it('retorna mock nfe sem creds', async () => {
      const result = await createBlingNfe(sampleInput);
      expect(result.source).toBe('mock');
      expect(result.invoiceKey).toHaveLength(44);
      expect(result.invoiceKey).toMatch(/^[0-9]{44}$/);
      expect(result.blingId).toBeNull();
      expect(result.invoiceUrl).toBeNull();
    });

    it('mock keys são determinísticos por orderId no mesmo timestamp', async () => {
      const r1 = await createBlingNfe(sampleInput);
      const r2 = await createBlingNfe({ ...sampleInput, orderId: 'order-different' });
      expect(r1.invoiceKey).not.toBe(r2.invoiceKey);
    });

    it('chama API real com OAuth quando creds presentes', async () => {
      process.env.BLING_CLIENT_ID = 'BLG-CLIENT';
      process.env.BLING_CLIENT_SECRET = 'BLG-SECRET';

      const calls: string[] = [];
      global.fetch = (async (url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url}`);
        if (url.includes('/oauth/token')) {
          return new Response(JSON.stringify({
            access_token: 'tok-real',
            expires_in: 3600,
          }), { status: 200 });
        }
        if (url.includes('/nfes')) {
          return new Response(JSON.stringify({
            data: {
              id: 'nfe-bling-1',
              chaveAcesso: '12345678901234567890123456789012345678901234',
              pdfUrl: 'https://bling.com.br/pdf/nfe-1.pdf',
            },
          }), { status: 200 });
        }
        return new Response('not found', { status: 404 });
      }) as typeof fetch;

      const result = await createBlingNfe(sampleInput);
      expect(result.source).toBe('bling');
      expect(result.invoiceKey).toBe('12345678901234567890123456789012345678901234');
      expect(result.blingId).toBe('nfe-bling-1');
      expect(result.invoiceUrl).toContain('bling.com.br/pdf');
      expect(calls.some((c) => c.includes('/oauth/token'))).toBe(true);
      expect(calls.some((c) => c.includes('/nfes'))).toBe(true);
    });

    it('lança erro quando OAuth token obtido mas API NF-e falha', async () => {
      process.env.BLING_CLIENT_ID = 'BLG-CLIENT';
      process.env.BLING_CLIENT_SECRET = 'BLG-SECRET';

      global.fetch = (async (url: string) => {
        if (url.includes('/oauth/token')) {
          return new Response(JSON.stringify({ access_token: 't', expires_in: 100 }), { status: 200 });
        }
        return new Response('error', { status: 500 });
      }) as typeof fetch;

      await expect(createBlingNfe(sampleInput)).rejects.toThrow(/bling_nfe_failed/);
    });

    it('retorna mock quando OAuth falha (sem token, fallback)', async () => {
      process.env.BLING_CLIENT_ID = 'BLG-CLIENT';
      process.env.BLING_CLIENT_SECRET = 'BLG-SECRET';

      global.fetch = (async () => new Response('unauthorized', { status: 401 })) as typeof fetch;

      const result = await createBlingNfe(sampleInput);
      expect(result.source).toBe('mock');
    });
  });
});
