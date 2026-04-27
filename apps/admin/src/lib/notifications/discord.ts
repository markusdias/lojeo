// Discord webhook sender — degraded mode sem URL.
//
// Tenant config: `tenant.config.notifications.discord.webhookUrl`.

import { logger } from '@lojeo/logger';

export interface DiscordMessageInput {
  webhookUrl: string;
  content: string;
  username?: string;
  /** Embed Discord — title + description + color (decimal int). */
  embed?: {
    title: string;
    description: string;
    color?: number; // 0xRRGGBB decimal
    url?: string;
  };
}

export interface DiscordSendResult {
  ok: boolean;
  mocked: boolean;
}

export async function sendDiscordWebhook(input: DiscordMessageInput): Promise<DiscordSendResult> {
  if (!input.webhookUrl) {
    return { ok: false, mocked: true };
  }
  try {
    const payload: Record<string, unknown> = {
      content: input.content,
      username: input.username ?? 'Lojeo',
    };
    if (input.embed) {
      payload.embeds = [
        {
          title: input.embed.title,
          description: input.embed.description,
          color: input.embed.color ?? 0xfacc15, // amber-400 default
          url: input.embed.url,
        },
      ];
    }
    const res = await fetch(input.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'discord webhook respondeu erro');
      return { ok: false, mocked: false };
    }
    return { ok: true, mocked: false };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendDiscordWebhook falhou');
    return { ok: false, mocked: false };
  }
}
