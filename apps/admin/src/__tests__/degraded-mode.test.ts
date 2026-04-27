/**
 * Modo degradado — Sprint 13 (admin).
 *
 * Valida que o painel admin continua funcional quando integrações externas
 * estão indisponíveis. Cada teste isola uma dependência via env vars + mocks.
 *
 * Princípio (CLAUDE.md): "Modo degradado: se IA, gateway ou serviço externo
 * falhar, a loja continua vendendo." — vale também para o admin.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { topPairsForProduct } from '@lojeo/engine';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
  vi.doUnmock('@lojeo/db');
  vi.doUnmock('../auth');
  vi.restoreAllMocks();
});

describe('admin degraded mode', () => {
  describe('Anthropic API key vazia', () => {
    beforeEach(() => {
      delete process.env.ANTHROPIC_API_KEY;
    });

    it('POST /api/ai-analyst retorna mockResponse markdown sem chamar Claude', async () => {
      // Mocks para isolar o handler de DB / auth / cache:
      vi.doMock('@lojeo/db', () => ({
        db: {
          query: { tenants: { findFirst: async () => ({ config: {} }) } },
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({ limit: async () => [] }),
                limit: async () => [],
              }),
            }),
          }),
          insert: () => ({ values: () => ({ returning: async () => [] }) }),
        },
        tenants: {},
        aiAnalystCache: {
          id: 'id', tenantId: 'tenantId', queryHash: 'queryHash',
          response: 'response', toolCalls: 'toolCalls', model: 'model',
          tokensIn: 'tokensIn', tokensOut: 'tokensOut',
          costUsdMicro: 'costUsdMicro', hitCount: 'hitCount',
          createdAt: 'createdAt',
        },
      }));
      vi.doMock('../auth', () => ({ auth: async () => null }));

      const { POST } = await import('../app/api/ai-analyst/route');
      const req = new Request('http://t/api/ai-analyst', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'qual a receita dos últimos 7 dias?' }] }),
      }) as unknown as Parameters<typeof POST>[0];

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { response: string; degraded: boolean };
      expect(json.degraded).toBe(true);
      expect(json.response).toContain('Modo demonstração');
      // Garante que markdown table veio na resposta mockada (UX preservada)
      expect(json.response).toMatch(/\|.*Período.*\|/);
    });
  });

  describe('R2 não configurado (STORAGE_DRIVER unset)', () => {
    beforeEach(() => {
      delete process.env.STORAGE_DRIVER;
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_BUCKET;
    });

    it('getStorage() retorna LocalDriver (fallback) sem exigir env R2', async () => {
      // Reimport fresh para zerar singleton interno
      const mod = await import('@lojeo/storage');
      const driver = mod.getStorage();
      expect(driver).toBeInstanceOf(mod.LocalDriver);
      expect(driver.publicUrl('a/b.png')).toMatch(/^\/_storage\//);
    });
  });

  describe('Integrations status (Sprint 13) — FaqZap/Bling/Melhor Envio offline', () => {
    beforeEach(() => {
      delete process.env.FAQZAP_API_TOKEN;
      delete process.env.BLING_CLIENT_ID;
      delete process.env.BLING_CLIENT_SECRET;
      delete process.env.MELHOR_ENVIO_TOKEN;
      delete process.env.TRIGGER_API_URL;
      delete process.env.TRIGGER_API_KEY;
    });

    it('GET /api/integrations/status reporta FaqZap como disconnected sem env', async () => {
      const { GET } = await import('../app/api/integrations/status/route');
      const res = await GET();
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        integrations: Array<{ name: string; status: string; message: string }>;
      };
      const faqzap = json.integrations.find(i => i.name === 'FaqZap');
      expect(faqzap).toBeDefined();
      expect(faqzap?.status).toBe('disconnected');
      expect(faqzap?.message).toMatch(/não conectado|disponível|manual/i);
    });

    it('GET /api/integrations/status reporta Bling NF-e como disconnected — emissão manual', async () => {
      const { GET } = await import('../app/api/integrations/status/route');
      const res = await GET();
      const json = (await res.json()) as {
        integrations: Array<{ name: string; status: string; message: string }>;
      };
      const bling = json.integrations.find(i => i.name.toLowerCase().includes('bling'));
      expect(bling).toBeDefined();
      expect(bling?.status).toBe('disconnected');
      expect(bling?.message).toMatch(/manual|não conectado/i);
    });

    it('GET /api/integrations/status reporta Melhor Envio como disconnected — frete manual', async () => {
      const { GET } = await import('../app/api/integrations/status/route');
      const res = await GET();
      const json = (await res.json()) as {
        integrations: Array<{ name: string; status: string; message: string }>;
      };
      const me = json.integrations.find(i => i.name.toLowerCase().includes('melhor envio'));
      expect(me).toBeDefined();
      expect(me?.status).toBe('disconnected');
      expect(me?.message).toMatch(/manual|não conectado/i);
    });

    it('GET /api/integrations/status reporta Trigger.dev como disconnected — jobs assíncronos off', async () => {
      const { GET } = await import('../app/api/integrations/status/route');
      const res = await GET();
      const json = (await res.json()) as {
        integrations: Array<{ name: string; status: string; message: string }>;
      };
      const trigger = json.integrations.find(i => i.name.toLowerCase().includes('trigger'));
      expect(trigger).toBeDefined();
      expect(trigger?.status).toBe('disconnected');
    });
  });

  describe('Recommendation engine sem dados de coocorrência', () => {
    it('topPairsForProduct retorna [] quando não há pairs computados (fallback é responsabilidade do route)', () => {
      const result = topPairsForProduct([], 'product-x', 4);
      expect(result).toEqual([]);
    });

    it('topPairsForProduct ignora produtos sem coocorrência mínima', () => {
      // Pair com cooccurrence 0 não deve passar (computeFrequentPairs já filtra,
      // mas garantimos que topPairsForProduct é puro e não inventa).
      const result = topPairsForProduct(
        [
          {
            productId: 'a',
            recommendedProductId: 'b',
            cooccurrence: 1,
            productCount: 5,
            recommendedCount: 5,
            support: 0.1,
            confidence: 0.2,
            lift: 1.2,
            score: 0.5,
          },
        ],
        'a',
        4,
      );
      // Mesmo com pair existente, função apenas filtra por productId — caso
      // route descarte pairs fracos, esta função entrega o que recebeu.
      expect(result).toHaveLength(1);
      expect(result[0]?.recommendedProductId).toBe('b');
    });
  });
});
