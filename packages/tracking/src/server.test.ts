import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock @lojeo/db: substitute db with chainable mocks. Tracks calls per-test.
const updateChain = {
  set: vi.fn(),
  where: vi.fn(),
  returning: vi.fn(),
};
const insertChain = {
  values: vi.fn(),
  returning: vi.fn(),
};
const selectFindFirst = vi.fn();

const dbMock = {
  query: { sessionsBehavior: { findFirst: selectFindFirst } },
  update: vi.fn(() => updateChain),
  insert: vi.fn(() => insertChain),
};

vi.mock('@lojeo/db', () => ({
  db: dbMock,
  behaviorEvents: { tenantId: 'tenantId', anonymousId: 'anonymousId', userId: 'userId' },
  sessionsBehavior: {
    id: 'id',
    tenantId: 'tenantId',
    anonymousId: 'anonymousId',
    userId: 'userId',
  },
}));

vi.mock('@lojeo/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

vi.mock('drizzle-orm', () => ({
  eq: (a: unknown, b: unknown) => ({ op: 'eq', a, b }),
  and: (...args: unknown[]) => ({ op: 'and', args }),
  isNull: (a: unknown) => ({ op: 'isNull', a }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockReturnValue(updateChain);
  updateChain.returning.mockResolvedValue([]);
  insertChain.values.mockReturnValue(insertChain);
  insertChain.returning.mockResolvedValue([]);
});

const { linkIdentity, ingest } = await import('./server');

describe('linkIdentity', () => {
  it('retorna 0/0 quando args missing', async () => {
    const r = await linkIdentity({ tenantId: '', anonymousId: 'a', userId: 'u' });
    expect(r).toEqual({ sessionsUpdated: 0, eventsUpdated: 0 });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  it('faz update sessionsBehavior + behaviorEvents quando args válidos', async () => {
    updateChain.returning
      .mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }]) // sessions
      .mockResolvedValueOnce([{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }]); // events

    const r = await linkIdentity({
      tenantId: 'tnt-1',
      anonymousId: 'anon-1',
      userId: 'usr-1',
    });
    expect(r).toEqual({ sessionsUpdated: 2, eventsUpdated: 3 });
    expect(dbMock.update).toHaveBeenCalledTimes(2);
  });

  it('idempotente: chama update mesmo se 0 rows afetadas', async () => {
    updateChain.returning.mockResolvedValue([]);
    const r = await linkIdentity({
      tenantId: 'tnt-1',
      anonymousId: 'anon-1',
      userId: 'usr-1',
    });
    expect(r).toEqual({ sessionsUpdated: 0, eventsUpdated: 0 });
    expect(dbMock.update).toHaveBeenCalledTimes(2);
  });
});

describe('ingest passa userId quando opts fornecido', () => {
  it('cria sessão nova com userId quando session não existe', async () => {
    selectFindFirst.mockResolvedValue(undefined);
    insertChain.returning.mockResolvedValueOnce([{ id: 'new-session' }]);
    insertChain.returning.mockResolvedValueOnce([]); // for events insert

    await ingest(
      {
        tenantId: 'tnt-1',
        anonymousId: 'anon-1',
        events: [{ type: 'product_view', ts: Date.now() }],
        consent: { essential: true, analytics: true, marketing: false },
      },
      { userId: 'usr-1' },
    );

    const firstCall = insertChain.values.mock.calls[0]?.[0];
    expect(firstCall.userId).toBe('usr-1');
  });
});
