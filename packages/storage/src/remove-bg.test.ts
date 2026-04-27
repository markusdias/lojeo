import { afterEach, describe, expect, it, vi } from 'vitest';
import { removeBg } from './remove-bg';

const FAKE_KEY = 'rb-test-key';
const ORIGINAL_FETCH = globalThis.fetch;

describe('removeBg', () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('modo degradado: retorna no_api_key sem fazer network call quando apiKey vazia', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const r = await removeBg({ apiKey: '', image: Buffer.from('x') });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('no_api_key');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sucesso: retorna binary image quando provider responde 200', async () => {
    const fakeBytes = Buffer.from([1, 2, 3, 4, 5]);
    const fetchSpy = vi.fn(async () =>
      new Response(new Uint8Array(fakeBytes), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const r = await removeBg({ apiKey: FAKE_KEY, image: Buffer.from('input'), mime: 'image/png' });

    expect(r.ok).toBe(true);
    expect(r.image).toBeInstanceOf(Buffer);
    expect(r.image?.equals(fakeBytes)).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const call = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://api.remove.bg/v1.0/removebg');
    const headers = call[1].headers as Record<string, string>;
    expect(headers['X-Api-Key']).toBe(FAKE_KEY);
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toBeInstanceOf(FormData);
  });

  it('falha 4xx: retorna ok=false com error http_<status> e detail do provider', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response('{"errors":[{"title":"Insufficient credits"}]}', {
        status: 402,
        headers: { 'content-type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const r = await removeBg({ apiKey: FAKE_KEY, image: Buffer.from('x') });

    expect(r.ok).toBe(false);
    expect(r.error).toBe('http_402');
    expect(r.detail).toContain('Insufficient credits');
  });

  it('network error: retorna ok=false com error=network_error e mensagem detail', async () => {
    const fetchSpy = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const r = await removeBg({ apiKey: FAKE_KEY, image: Buffer.from('x') });

    expect(r.ok).toBe(false);
    expect(r.error).toBe('network_error');
    expect(r.detail).toContain('ECONNRESET');
  });

  it('endpoint override é respeitado (útil para mock/proxy/testes)', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(new Uint8Array(Buffer.from([9, 9])), { status: 200 }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    await removeBg({
      apiKey: FAKE_KEY,
      image: Buffer.from('x'),
      endpoint: 'http://mock.local/removebg',
    });
    const firstCall = fetchSpy.mock.calls[0] as unknown as [string, RequestInit] | undefined;
    expect(firstCall?.[0]).toBe('http://mock.local/removebg');
  });
});
