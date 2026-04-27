// Slack incoming webhook sender — degraded mode sem URL.
//
// Tenant config: `tenant.config.notifications.slack.webhookUrl`.
// Sem URL: no-op, retorna { ok: false, mocked: true }.

import { logger } from '@lojeo/logger';

export interface SlackMessageInput {
  webhookUrl: string;
  text: string;
  username?: string;
  iconEmoji?: string;
  /** Cor da side-bar do attachment (hex or "good"/"warning"/"danger") */
  attachmentColor?: 'good' | 'warning' | 'danger' | string;
  /** Lista de fields exibidos na attachment */
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  link?: string;
}

export interface SlackSendResult {
  ok: boolean;
  mocked: boolean;
}

export async function sendSlackWebhook(input: SlackMessageInput): Promise<SlackSendResult> {
  if (!input.webhookUrl) {
    return { ok: false, mocked: true };
  }
  try {
    const payload: Record<string, unknown> = {
      text: input.text,
      username: input.username ?? 'Lojeo',
      icon_emoji: input.iconEmoji ?? ':bell:',
    };
    if (input.fields?.length || input.attachmentColor || input.link) {
      payload.attachments = [
        {
          color: input.attachmentColor ?? 'warning',
          fields: input.fields ?? [],
          footer: input.link ? `<${input.link}|Open in Lojeo>` : undefined,
        },
      ];
    }
    const res = await fetch(input.webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'slack webhook respondeu erro');
      return { ok: false, mocked: false };
    }
    return { ok: true, mocked: false };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendSlackWebhook falhou');
    return { ok: false, mocked: false };
  }
}
