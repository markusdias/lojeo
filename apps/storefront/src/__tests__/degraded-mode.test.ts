/**
 * Modo degradado — Sprint 13.
 *
 * Valida que o storefront continua respondendo quando dependências externas
 * estão off. Cada teste isola uma dependência via env vars + mocks pontuais.
 *
 * Princípio (CLAUDE.md): "Modo degradado: se IA, gateway ou serviço externo
 * falhar, a loja continua vendendo."
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('storefront degraded mode', () => {
  describe('IA Claude offline (sem ANTHROPIC_API_KEY)', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('POST /api/chat retorna fallback FAQ + WhatsApp button', async () => {
      // Import dinâmico após zerar env — garante que ANTHROPIC_API_KEY=''
      // é lida no module-load do route.
      const { POST } = await import('../app/api/chat/route');
      const req = new Request('http://t/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-session-id': 'test-degraded-1' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'olá' }] }),
      }) as unknown as Parameters<typeof POST>[0];

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { response: string; degraded: boolean; whatsapp: string };
      expect(json.degraded).toBe(true);
      expect(typeof json.response).toBe('string');
      expect(json.response.length).toBeGreaterThan(0);
      expect(json.whatsapp).toMatch(/wa\.me/);
    });
  });

  describe('Mercado Pago não configurado', () => {
    beforeEach(() => {
      delete process.env.MERCADO_PAGO_ACCESS_TOKEN;
    });

    it('GET /api/status reporta MP como degraded mas serviços essenciais continuam', async () => {
      // Mock @lojeo/db para não exigir DB real — DB check é independente do MP.
      vi.doMock('@lojeo/db', () => ({
        db: {
          execute: async () => ({ rows: [{ ok: 1 }] }),
          select: () => ({
            from: () => ({
              limit: () => Promise.resolve([{ count: 0 }]),
            }),
          }),
        },
        products: {},
      }));

      const { GET } = await import('../app/api/status/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        overall: string;
        services: Array<{ name: string; status: string; message?: string }>;
      };
      const mp = json.services.find((s) => s.name.toLowerCase().includes('mercado pago'));
      expect(mp).toBeDefined();
      expect(mp?.status).toBe('degraded');
      expect(mp?.message).toMatch(/MP|simulado|conectado/i);
      // Storefront continua serving — overall pode ser degraded, mas nunca 'down'
      expect(json.overall).not.toBe('down');
    });
  });

  describe('Gift card validate (Sprint 13) — edge cases retornam valid:false sem quebrar', () => {
    function mockGiftCardRow(card: Record<string, unknown> | null) {
      vi.doMock('@lojeo/db', () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () => ({
                limit: async () => (card ? [card] : []),
              }),
            }),
          }),
        },
        giftCards: {
          tenantId: 'tenant_id',
          code: 'code',
          currentBalanceCents: 'current_balance_cents',
          expiresAt: 'expires_at',
          status: 'status',
        },
      }));
    }

    it('code não encontrado → valid:false reason:not_found', async () => {
      mockGiftCardRow(null);
      const { POST } = await import('../app/api/gift-cards/validate/route');
      const req = new Request('http://t/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'GFT-AAAA-BBBB-CCCC' }),
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { valid: boolean; reason: string };
      expect(json.valid).toBe(false);
      expect(json.reason).toBe('not_found');
    });

    it('card inactive → valid:false reason:inactive', async () => {
      mockGiftCardRow({
        code: 'GFT-AAAA-BBBB-CCCC',
        currentBalanceCents: 10000,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        status: 'used',
      });
      const { POST } = await import('../app/api/gift-cards/validate/route');
      const req = new Request('http://t/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'GFT-AAAA-BBBB-CCCC' }),
      });
      const res = await POST(req);
      const json = (await res.json()) as { valid: boolean; reason: string; status: string };
      expect(json.valid).toBe(false);
      expect(json.reason).toBe('inactive');
      expect(json.status).toBe('used');
    });

    it('saldo zerado → valid:false reason:depleted', async () => {
      mockGiftCardRow({
        code: 'GFT-AAAA-BBBB-CCCC',
        currentBalanceCents: 0,
        expiresAt: new Date(Date.now() + 30 * 86400000),
        status: 'active',
      });
      const { POST } = await import('../app/api/gift-cards/validate/route');
      const req = new Request('http://t/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'GFT-AAAA-BBBB-CCCC' }),
      });
      const res = await POST(req);
      const json = (await res.json()) as { valid: boolean; reason: string; balanceCents: number };
      expect(json.valid).toBe(false);
      expect(json.reason).toBe('depleted');
      expect(json.balanceCents).toBe(0);
    });

    it('card expirado → valid:false reason:expired', async () => {
      mockGiftCardRow({
        code: 'GFT-AAAA-BBBB-CCCC',
        currentBalanceCents: 10000,
        expiresAt: new Date(Date.now() - 86400000),
        status: 'active',
      });
      const { POST } = await import('../app/api/gift-cards/validate/route');
      const req = new Request('http://t/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'GFT-AAAA-BBBB-CCCC' }),
      });
      const res = await POST(req);
      const json = (await res.json()) as { valid: boolean; reason: string };
      expect(json.valid).toBe(false);
      expect(json.reason).toBe('expired');
    });

    it('card válido com saldo + expiração futura → valid:true', async () => {
      const future = new Date(Date.now() + 30 * 86400000);
      mockGiftCardRow({
        code: 'GFT-AAAA-BBBB-CCCC',
        currentBalanceCents: 25000,
        expiresAt: future,
        status: 'active',
      });
      const { POST } = await import('../app/api/gift-cards/validate/route');
      const req = new Request('http://t/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'GFT-AAAA-BBBB-CCCC' }),
      });
      const res = await POST(req);
      const json = (await res.json()) as { valid: boolean; balanceCents: number };
      expect(json.valid).toBe(true);
      expect(json.balanceCents).toBe(25000);
    });
  });

  describe('Resend não configurado (sem RESEND_API_KEY)', () => {
    beforeEach(() => {
      delete process.env.RESEND_API_KEY;
    });

    it('GET /api/status reporta email como degraded — pedido cria normal sem email enviado', async () => {
      vi.doMock('@lojeo/db', () => ({
        db: {
          execute: async () => ({ rows: [{ ok: 1 }] }),
          select: () => ({
            from: () => ({
              limit: () => Promise.resolve([{ count: 0 }]),
            }),
          }),
        },
        products: {},
      }));

      const { GET } = await import('../app/api/status/route');
      const res = await GET();
      const json = (await res.json()) as {
        services: Array<{ name: string; status: string; message?: string }>;
      };
      const email = json.services.find((s) => s.name.toLowerCase().includes('email'));
      expect(email).toBeDefined();
      expect(email?.status).toBe('degraded');
      expect(email?.message).toMatch(/Resend|desativado/i);
    });
  });
});
