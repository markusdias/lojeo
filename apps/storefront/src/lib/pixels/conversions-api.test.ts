import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hashSha256, sendMetaConversion, sendMetaPurchase } from './conversions-api';

describe('hashSha256', () => {
  it('produz hex SHA256 estável', () => {
    expect(hashSha256('test@example.com')).toBe(
      '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b',
    );
  });

  it('case-sensitive (callers normalizam antes)', () => {
    expect(hashSha256('A')).not.toBe(hashSha256('a'));
  });
});

describe('sendMetaConversion', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mocked sem pixelId', async () => {
    const r = await sendMetaConversion({ pixelId: '', accessToken: 'tok', eventName: 'Purchase' });
    expect(r).toEqual({ ok: false, mocked: true });
  });

  it('mocked sem accessToken', async () => {
    const r = await sendMetaConversion({ pixelId: '123', accessToken: '', eventName: 'Purchase' });
    expect(r).toEqual({ ok: false, mocked: true });
  });

  it('POST graph.facebook.com/v18.0 com event Purchase + user_data hashed', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1, fbtrace_id: 'AbC' }), { status: 200 }),
    );
    const r = await sendMetaConversion({
      pixelId: '999',
      accessToken: 'tok-secret',
      eventName: 'Purchase',
      userData: { email: 'TEST@example.com', phone: '+55 (11) 91234-5678' },
      customData: { currency: 'BRL', value: 250.5 },
    });
    expect(r.ok).toBe(true);
    expect(r.eventsReceived).toBe(1);
    expect(r.fbtrace_id).toBe('AbC');

    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('graph.facebook.com/v18.0/999/events');
    expect(url).toContain('access_token=tok-secret');

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.data[0].event_name).toBe('Purchase');
    expect(body.data[0].user_data.em[0]).toBe(hashSha256('test@example.com'));
    // Phone normalizado (digits only)
    expect(body.data[0].user_data.ph[0]).toBe(hashSha256('5511912345678'));
    expect(body.data[0].custom_data.value).toBe(250.5);
  });

  it('inclui test_event_code quando passado', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await sendMetaConversion({
      pixelId: '1',
      accessToken: 't',
      eventName: 'Purchase',
      testEventCode: 'TEST12345',
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.test_event_code).toBe('TEST12345');
  });

  it('retorna ok=false em status 400 (Meta erro)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{"error":"invalid"}', { status: 400 }));
    const r = await sendMetaConversion({ pixelId: '1', accessToken: 't', eventName: 'Purchase' });
    expect(r.ok).toBe(false);
    expect(r.mocked).toBe(false);
  });

  it('captura throw fetch e retorna ok=false', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const r = await sendMetaConversion({ pixelId: '1', accessToken: 't', eventName: 'Purchase' });
    expect(r.ok).toBe(false);
  });
});

describe('sendMetaPurchase', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mocked sem pixelId/accessToken', async () => {
    const r = await sendMetaPurchase({
      orderId: 'ord-1',
      orderTotalCents: 5000,
      currency: 'BRL',
    });
    expect(r).toEqual({ ok: false, mocked: true });
  });

  it('envia event_name=Purchase + value cents/100 + eventId order-${id}', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ events_received: 1 }), { status: 200 }),
    );
    await sendMetaPurchase({
      pixelId: '1',
      accessToken: 't',
      orderId: 'abc-123',
      orderTotalCents: 12990,
      currency: 'USD',
      customerEmail: 'a@b.com',
      contentIds: ['p1', 'p2'],
      numItems: 2,
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    const evt = body.data[0];
    expect(evt.event_name).toBe('Purchase');
    expect(evt.event_id).toBe('order-abc-123');
    expect(evt.custom_data.value).toBe(129.9);
    expect(evt.custom_data.currency).toBe('USD');
    expect(evt.custom_data.content_ids).toEqual(['p1', 'p2']);
    expect(evt.custom_data.num_items).toBe(2);
  });
});
