import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sendDiscordWebhook } from './discord';

describe('sendDiscordWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('mocked sem URL', async () => {
    const r = await sendDiscordWebhook({ webhookUrl: '', content: 'hi' });
    expect(r).toEqual({ ok: false, mocked: true });
  });

  it('POST content + username default', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));
    const r = await sendDiscordWebhook({ webhookUrl: 'https://discord.com/api/webhooks/x', content: 'alert' });
    expect(r.ok).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.content).toBe('alert');
    expect(body.username).toBe('Lojeo');
  });

  it('embed quando presente', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
    await sendDiscordWebhook({
      webhookUrl: 'https://x',
      content: 'a',
      embed: { title: 'Estoque baixo', description: 'Anel Aço · 3 unid', color: 0xef4444 },
    });
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.embeds[0].title).toBe('Estoque baixo');
    expect(body.embeds[0].color).toBe(0xef4444);
  });

  it('status erro retorna ok=false', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    const r = await sendDiscordWebhook({ webhookUrl: 'https://x', content: 'a' });
    expect(r.ok).toBe(false);
    expect(r.mocked).toBe(false);
  });
});
