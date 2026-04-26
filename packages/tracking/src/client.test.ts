import { describe, expect, it, beforeEach, vi } from 'vitest';

class MemStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  key(i: number): string | null {
    return [...this.map.keys()][i] ?? null;
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemStorage());
  vi.restoreAllMocks();
});

const { Tracker, setConsent, getAnonId } = await import('./client');

describe('Tracker', () => {
  it('persiste anonymousId entre instâncias', () => {
    const a = getAnonId();
    const b = getAnonId();
    expect(a).toBe(b);
  });

  it('descarta evento analytics sem consent', async () => {
    const t = new Tracker({ tenantId: 'tnt-1', flushIntervalMs: 60_000 });
    setConsent({ analytics: false });
    t.track({ type: 'product_scroll', metadata: { depth: 50 } });
    const spy = vi.spyOn(globalThis, 'fetch' as const).mockResolvedValue(new Response());
    await t.flush();
    expect(spy).not.toHaveBeenCalled();
  });

  it('faz POST quando há eventos essenciais', async () => {
    setConsent({ analytics: true });
    const t = new Tracker({ tenantId: 'tnt-1', flushIntervalMs: 60_000 });
    const spy = vi.spyOn(globalThis, 'fetch' as const).mockResolvedValue(new Response());
    t.track({ type: 'product_view', entityId: 'p1' });
    await t.flush();
    expect(spy).toHaveBeenCalledOnce();
  });
});
