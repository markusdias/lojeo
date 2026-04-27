// Multichannel notification orchestrator.
//
// Para cada notificação:
// 1. Sempre cria in-app (sellerNotifications row) via emitSellerNotification.
// 2. Se severity === 'critical' (ou explicit channels): tenta canais externos
//    (email lojista admin, slack webhook, discord webhook) baseado em
//    tenant.config.notifications.{email,slack,discord}.
// 3. Cada canal degrada silenciosamente quando config ausente.

import { db, tenants, emitSellerNotification, type EmitSellerNotificationInput } from '@lojeo/db';
import { eq } from 'drizzle-orm';
import { sendEmail, getStoreEmailConfig } from '@lojeo/email';
import { logger } from '@lojeo/logger';
import { sendSlackWebhook } from './slack';
import { sendDiscordWebhook } from './discord';

export interface MultichannelChannelsTried {
  inapp: boolean;
  email: boolean;
  slack: boolean;
  discord: boolean;
  push: boolean;
}

export interface NotificationConfig {
  email?: { enabled?: boolean; recipientsCsv?: string };
  slack?: { webhookUrl?: string };
  discord?: { webhookUrl?: string };
  push?: { enabled?: boolean };
}

interface TenantConfigShape {
  notifications?: NotificationConfig;
  [k: string]: unknown;
}

async function readNotificationConfig(tenantId: string): Promise<NotificationConfig> {
  try {
    const [t] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const cfg = (t?.config ?? {}) as TenantConfigShape;
    return cfg.notifications ?? {};
  } catch {
    return {};
  }
}

export interface EmitMultichannelInput extends EmitSellerNotificationInput {
  /** Canais explícitos (sobrescreve default por severity). */
  channels?: Array<'inapp' | 'email' | 'slack' | 'discord' | 'push'>;
}

export async function emitMultichannelNotification(
  input: EmitMultichannelInput,
): Promise<{ inappId: string | null; tried: MultichannelChannelsTried }> {
  const tried: MultichannelChannelsTried = {
    inapp: false,
    email: false,
    slack: false,
    discord: false,
    push: false,
  };

  // 1) In-app sempre
  const inapp = await emitSellerNotification(input);
  tried.inapp = !!inapp;

  // Default channels: critical → todos; warning → slack/discord; info → só inapp.
  const explicit = input.channels;
  const severity = input.severity ?? 'info';
  const useEmail = explicit ? explicit.includes('email') : severity === 'critical';
  const useSlack = explicit ? explicit.includes('slack') : severity === 'critical' || severity === 'warning';
  const useDiscord = explicit ? explicit.includes('discord') : severity === 'critical' || severity === 'warning';

  if (!useEmail && !useSlack && !useDiscord) {
    return { inappId: inapp?.id ?? null, tried };
  }

  const cfg = await readNotificationConfig(input.tenantId);

  // Email — admin recipients via tenant.config.notifications.email.recipientsCsv
  if (useEmail && cfg.email?.enabled !== false) {
    try {
      const recipients = (cfg.email?.recipientsCsv ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (recipients.length > 0) {
        const { fromEmail, storeName } = getStoreEmailConfig();
        const subjectPrefix = severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
        const body = `<p><strong>${input.title}</strong></p>${input.body ? `<p>${input.body}</p>` : ''}${input.link ? `<p><a href="${input.link}">Open in Lojeo</a></p>` : ''}`;
        const r = await sendEmail({
          from: fromEmail,
          to: recipients,
          subject: `${subjectPrefix} ${storeName} · ${input.title}`,
          html: body,
        });
        tried.email = r.delivered;
      }
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'multichannel email failed');
    }
  }

  // Slack
  if (useSlack && cfg.slack?.webhookUrl) {
    const color = severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'good';
    const r = await sendSlackWebhook({
      webhookUrl: cfg.slack.webhookUrl,
      text: input.title,
      attachmentColor: color,
      fields: input.body ? [{ title: 'Details', value: input.body, short: false }] : [],
      link: input.link ?? undefined,
    });
    tried.slack = r.ok;
  }

  // Discord
  if (useDiscord && cfg.discord?.webhookUrl) {
    const color = severity === 'critical' ? 0xef4444 : severity === 'warning' ? 0xfacc15 : 0x10b981;
    const r = await sendDiscordWebhook({
      webhookUrl: cfg.discord.webhookUrl,
      content: input.title,
      embed: input.body
        ? { title: input.title, description: input.body, color, url: input.link ?? undefined }
        : undefined,
    });
    tried.discord = r.ok;
  }

  return { inappId: inapp?.id ?? null, tried };
}
