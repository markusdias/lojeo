// Transactional emails admin-side — render React Email + sendEmail dual mode.

import { sendEmail, render, ShippingNotification, TradeApproved } from '@lojeo/email';
import { logger } from '@lojeo/logger';

const STORE_NAME = process.env.STOREFRONT_STORE_NAME ?? 'Atelier';
const FROM_EMAIL = process.env.STOREFRONT_FROM_EMAIL ?? 'no-reply@lojeo.app';
const STOREFRONT_BASE = process.env.STOREFRONT_PUBLIC_URL ?? 'https://lojeo.app';

interface ShippingEmailInput {
  customerEmail: string;
  orderCode: string;
  trackingCode: string;
  estimatedDelivery: string;
  orderId: string;
}

export async function sendShippingNotificationEmail(input: ShippingEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail) return { ok: false };
  try {
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const html = await render(
      ShippingNotification({
        storeName: STORE_NAME,
        estimatedDelivery: input.estimatedDelivery,
        trackingCode: input.trackingCode,
        trackingUrl: `${STOREFRONT_BASE}/rastreio?order=${input.orderId}`,
        stops: [
          { status: 'done', label: 'Pedido enviado', date: today },
          { status: 'current', label: 'Em trânsito', date: '—' },
          { status: 'future', label: 'Saiu para entrega', date: '—' },
          { status: 'future', label: 'Entregue', date: '—' },
        ],
        supportEmail: FROM_EMAIL,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: FROM_EMAIL,
      subject: `Seu pedido foi enviado · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendShippingNotification failed');
    return { ok: false };
  }
}

interface TradeApprovedEmailInput {
  customerEmail: string;
  orderCode: string;
  type: 'exchange' | 'refund' | 'warranty';
  labelPdfUrl?: string;
}

export async function sendTradeApprovedEmail(input: TradeApprovedEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail) return { ok: false };
  try {
    const typeLabel = input.type === 'exchange' ? 'Troca' : input.type === 'warranty' ? 'Garantia' : 'Devolução';
    const html = await render(
      TradeApproved({
        storeName: STORE_NAME,
        labelPdfUrl: input.labelPdfUrl ?? `${STOREFRONT_BASE}/conta`,
        supportEmail: FROM_EMAIL,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: FROM_EMAIL,
      subject: `${typeLabel} aprovada · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendTradeApprovedEmail failed');
    return { ok: false };
  }
}
