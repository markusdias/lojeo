import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendSlackWebhook } from './slack';

describe('sendSlackWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mocked quando webhookUrl vazio', async () => {
    const r = await sendSlackWebhook({ webhookUrl: '', text: 'hi' });
    expect(r).toEqual({ ok: false, mocked: true });
  });

  it('POST payload com text + username default', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const r = await sendSlackWebhook({ webhookUrl: 'https://hooks.slack.com/x', text: 'low stock alert' });
    expect(r.ok).toBe(true);
    expect(r.mocked).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0]!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.text).toBe('low stock alert');
    expect(body.username).toBe('Lojeo');
  });

  it('attachments quando fields presentes', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    await sendSlackWebhook({
      webhookUrl: 'https://x',
      text: 'alert',
      fields: [{ title: 'SKU', value: 'ABC-123' }],
      attachmentColor: 'danger',
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.attachments[0].color).toBe('danger');
    expect(body.attachments[0].fields[0].title).toBe('SKU');
  });

  it('retorna ok=false em status 400', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('bad', { status: 400 }));
    const r = await sendSlackWebhook({ webhookUrl: 'https://x', text: 't' });
    expect(r.ok).toBe(false);
    expect(r.mocked).toBe(false);
  });

  it('captura throw fetch e retorna ok=false', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const r = await sendSlackWebhook({ webhookUrl: 'https://x', text: 't' });
    expect(r.ok).toBe(false);
  });
});
