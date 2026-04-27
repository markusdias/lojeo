// Transactional emails admin-side — render React Email + sendEmail dual mode.

import { sendEmail, render, ShippingNotification, TradeApproved, RecoverCart, type RecoverCartItem, getStoreEmailConfig } from '@lojeo/email';
import { logger } from '@lojeo/logger';

function cfg() { return getStoreEmailConfig(); }

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
        storeName: cfg().storeName,
        estimatedDelivery: input.estimatedDelivery,
        trackingCode: input.trackingCode,
        trackingUrl: `${cfg().storefrontBase}/rastreio?order=${input.orderId}`,
        stops: [
          { status: 'done', label: 'Pedido enviado', date: today },
          { status: 'current', label: 'Em trânsito', date: '—' },
          { status: 'future', label: 'Saiu para entrega', date: '—' },
          { status: 'future', label: 'Entregue', date: '—' },
        ],
        supportEmail: cfg().fromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
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
        storeName: cfg().storeName,
        labelPdfUrl: input.labelPdfUrl ?? `${cfg().storefrontBase}/conta`,
        supportEmail: cfg().fromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject: `${typeLabel} aprovada · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendTradeApprovedEmail failed');
    return { ok: false };
  }
}

interface RecoverCartEmailInput {
  customerEmail: string;
  customerName?: string;
  items: RecoverCartItem[];
  subtotalCents: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  cartUrl?: string;
}

export async function sendRecoverCartEmail(input: RecoverCartEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail) return { ok: false };
  if (!input.items.length) return { ok: false };
  try {
    const currency = input.currency ?? 'BRL';
    const isPt = currency === 'BRL';
    const subject = isPt
      ? `Seu carrinho está esperando · ${cfg().storeName}`
      : `Your cart is waiting · ${cfg().storeName}`;
    const html = await render(
      RecoverCart({
        storeName: cfg().storeName,
        customerName: input.customerName,
        items: input.items,
        subtotalCents: input.subtotalCents,
        currency,
        cartUrl: input.cartUrl ?? `${cfg().storefrontBase}/carrinho`,
        supportEmail: cfg().fromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendRecoverCartEmail failed');
    return { ok: false };
  }
}
