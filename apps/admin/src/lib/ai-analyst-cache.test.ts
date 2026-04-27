import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock @lojeo/db ANTES de importar o módulo sob teste — funções DB são exercitadas
// via stubs in-memory para validar contratos (lookup miss/hit, store).
type Row = {
  id: string;
  tenantId: string;
  queryHash: string;
  queryNormalized: string;
  response: unknown;
  toolCalls: unknown;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsdMicro: number;
  hitCount: number;
  createdAt: Date;
};

const memoryStore: Row[] = [];

vi.mock('@lojeo/logger', () => ({
  logger: { warn: () => undefined, error: () => undefined, info: () => undefined },
}));

vi.mock('@lojeo/db', () => {
  // Builder fluente que casa com a API que usamos no helper:
  //   db.select(...).from(...).where(...).orderBy(...).limit(...)
  //   db.update(...).set(...).where(...)
  //   db.insert(...).values(...).onConflictDoNothing(...)
  let lastTenantId: string | null = null;
  let lastHash: string | null = null;

  const selectChain = {
    from() { return this; },
    where(predicate: unknown) {
      // Captura tenant + hash via reflection do operador composto: usamos os
      // próprios valores passados nas helpers eq() abaixo.
      const meta = predicate as { __tenantId?: string; __hash?: string; __sinceMs?: number };
      lastTenantId = meta.__tenantId ?? null;
      lastHash = meta.__hash ?? null;
      return this;
    },
    orderBy() { return this; },
    async limit(_n: number) {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const matches = memoryStore.filter(r =>
        r.tenantId === lastTenantId &&
        r.queryHash === lastHash &&
        r.createdAt.getTime() >= cutoff
      );
      return matches.length > 0 && matches[0]
        ? [{
            id: matches[0].id,
            response: matches[0].response,
            toolCalls: matches[0].toolCalls,
            model: matches[0].model,
            tokensIn: matches[0].tokensIn,
            tokensOut: matches[0].tokensOut,
            costUsdMicro: matches[0].costUsdMicro,
            hitCount: matches[0].hitCount,
            createdAt: matches[0].createdAt,
          }]
        : [];
    },
  };

  const updateChain = {
    set(_patch: Record<string, unknown>) { return this; },
    where(predicate: unknown) {
      const meta = predicate as { __id?: string };
      const row = memoryStore.find(r => r.id === meta.__id);
      if (row) row.hitCount += 1;
      return Promise.resolve();
    },
    catch() { return this; },
  };

  const insertChain = {
    values(payload: Omit<Row, 'id' | 'createdAt'>) {
      this.__payload = payload;
      return this;
    },
    onConflictDoNothing(_opts: unknown) {
      const exists = memoryStore.some(r =>
        r.tenantId === this.__payload.tenantId &&
        r.queryHash === this.__payload.queryHash
      );
      if (!exists) {
        memoryStore.push({
          id: `row-${memoryStore.length + 1}`,
          createdAt: new Date(),
          ...this.__payload,
        });
      }
      return Promise.resolve();
    },
    __payload: undefined as unknown as Omit<Row, 'id' | 'createdAt'>,
  };

  return {
    db: {
      select: () => selectChain,
      update: () => updateChain,
      insert: () => insertChain,
    },
    aiAnalystCache: {
      id: { name: 'id' },
      tenantId: '__tenantId',
      queryHash: '__hash',
      queryNormalized: '__queryNormalized',
      response: '__response',
      toolCalls: '__toolCalls',
      model: '__model',
      tokensIn: '__tokensIn',
      tokensOut: '__tokensOut',
      costUsdMicro: '__costUsdMicro',
      hitCount: '__hitCount',
      createdAt: '__createdAt',
    },
  };
});

// drizzle-orm helpers — produzem objetos sentinela que o select mock interpreta.
vi.mock('drizzle-orm', () => {
  return {
    and: (...preds: Record<string, unknown>[]) => Object.assign({}, ...preds),
    eq: (col: unknown, val: unknown) => {
      if (col === '__tenantId') return { __tenantId: val };
      if (col === '__hash') return { __hash: val };
      if (typeof col === 'object' && col !== null && (col as { name?: string }).name === 'id') {
        return { __id: val };
      }
      return {};
    },
    gte: (_col: unknown, val: Date) => ({ __sinceMs: (val as Date).getTime() }),
    desc: (col: unknown) => col,
    sql: (() => {
      const tag = (_strings: TemplateStringsArray, ..._values: unknown[]) => '__sql__';
      return tag;
    })(),
  };
});

import {
  normalize,
  hashQuery,
  lookup,
  store,
  type CacheEntry,
} from './ai-analyst-cache';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_B = '00000000-0000-0000-0000-000000000002';

beforeEach(() => {
  memoryStore.length = 0;
});

describe('normalize', () => {
  it('lowercase + trim + colapsa whitespace + strip pontuação final', () => {
    expect(normalize('  Receita   dos últimos 7  dias?? ')).toBe('receita dos últimos 7 dias');
  });

  it('mantém pontuação interna intacta', () => {
    expect(normalize('vendas: 7 dias.')).toBe('vendas: 7 dias');
  });

  it('queries equivalentes geram mesma forma normalizada', () => {
    expect(normalize('Quais TOP produtos?')).toBe(normalize('quais top produtos'));
  });
});

describe('hashQuery', () => {
  it('é determinístico — mesma entrada → mesmo hash', () => {
    const h1 = hashQuery(TENANT_A, 'Receita 7 dias');
    const h2 = hashQuery(TENANT_A, 'receita 7 dias  ');
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('isola tenants — mesma query, tenants diferentes → hashes diferentes', () => {
    const hA = hashQuery(TENANT_A, 'Top 5 produtos');
    const hB = hashQuery(TENANT_B, 'Top 5 produtos');
    expect(hA).not.toBe(hB);
  });

  it('queries semanticamente diferentes geram hashes diferentes', () => {
    const h1 = hashQuery(TENANT_A, 'Receita 7 dias');
    const h2 = hashQuery(TENANT_A, 'Receita 30 dias');
    expect(h1).not.toBe(h2);
  });
});

describe('lookup miss/hit + store', () => {
  it('miss inicial → null; após store → hit retorna entrada', async () => {
    const hash = hashQuery(TENANT_A, 'Top produtos');

    const miss = await lookup(TENANT_A, hash);
    expect(miss).toBeNull();

    await store(
      TENANT_A,
      hash,
      'Top produtos',
      { response: 'mock', degraded: false },
      [{ name: 'top_products' }],
      'claude-sonnet-4-5',
      120,
      300,
      4_950,
    );

    const hit = (await lookup(TENANT_A, hash)) as CacheEntry;
    expect(hit).not.toBeNull();
    expect(hit.model).toBe('claude-sonnet-4-5');
    expect(hit.tokensIn).toBe(120);
    expect(hit.tokensOut).toBe(300);
    expect(hit.costUsdMicro).toBe(4_950);
  });

  it('store é idempotente em conflito (mesmo tenant+hash) — não duplica', async () => {
    const hash = hashQuery(TENANT_A, 'Funil 30d');
    await store(TENANT_A, hash, 'Funil 30d', { r: 1 }, [], 'm', 1, 2, 3);
    await store(TENANT_A, hash, 'Funil 30d', { r: 2 }, [], 'm', 4, 5, 6);
    expect(memoryStore.length).toBe(1);
    expect((memoryStore[0]?.response as { r: number }).r).toBe(1);
  });

  it('isolation entre tenants — TENANT_B não vê cache do TENANT_A', async () => {
    const query = 'Quais clientes vão churnar?';
    const hashA = hashQuery(TENANT_A, query);
    const hashB = hashQuery(TENANT_B, query);

    await store(TENANT_A, hashA, query, { only: 'A' }, [], 'm', 0, 0, 0);

    const fromB = await lookup(TENANT_B, hashB);
    expect(fromB).toBeNull();

    const fromA = await lookup(TENANT_A, hashA);
    expect(fromA).not.toBeNull();
  });
});
