// WhatsApp send helper — FaqZap stub (degraded mode).
// Integração real exige FAQZAP_API_KEY + FAQZAP_INSTANCE_ID. Sem keys, retorna
// `{ ok: false, mocked: true }` para o caller saber que a notificação não saiu
// e marcar `lastNotifiedAt` apenas se outro canal teve sucesso.

import { logger } from '@lojeo/logger';

export interface WhatsappSendInput {
  to: string;
  body: string;
}

export interface WhatsappSendResult {
  ok: boolean;
  mocked: boolean;
  id?: string | null;
}

export async function sendWhatsapp(input: WhatsappSendInput): Promise<WhatsappSendResult> {
  const apiKey = process.env.FAQZAP_API_KEY;
  const instanceId = process.env.FAQZAP_INSTANCE_ID;
  if (!apiKey || !instanceId) {
    logger.info({ to: input.to }, 'FAQZAP keys ausentes — WhatsApp mockado');
    return { ok: false, mocked: true };
  }
  try {
    const res = await fetch(`https://api.faqzap.com/v1/instances/${instanceId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: input.to, type: 'text', body: input.body }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn({ status: res.status, text }, 'FaqZap respondeu erro');
      return { ok: false, mocked: false };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, mocked: false, id: data.id ?? null };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendWhatsapp falhou');
    return { ok: false, mocked: false };
  }
}
