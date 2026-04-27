// Transactional emails admin-side — render React Email + sendEmail dual mode.

import { sendEmail, render, ShippingNotification, TradeApproved, RecoverCart, type RecoverCartItem, getStoreEmailConfig, emailSubjects } from '@lojeo/email';
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
    const conf = cfg();
    const isPt = conf.locale === 'pt-BR';
    const today = new Date().toLocaleDateString(conf.locale, { day: '2-digit', month: 'short' });
    const stops = isPt
      ? [
          { status: 'done' as const, label: 'Pedido enviado', date: today },
          { status: 'current' as const, label: 'Em trânsito', date: '—' },
          { status: 'future' as const, label: 'Saiu para entrega', date: '—' },
          { status: 'future' as const, label: 'Entregue', date: '—' },
        ]
      : [
          { status: 'done' as const, label: 'Order shipped', date: today },
          { status: 'current' as const, label: 'In transit', date: '—' },
          { status: 'future' as const, label: 'Out for delivery', date: '—' },
          { status: 'future' as const, label: 'Delivered', date: '—' },
        ];
    const html = await render(
      ShippingNotification({
        storeName: conf.storeName,
        estimatedDelivery: input.estimatedDelivery,
        trackingCode: input.trackingCode,
        trackingUrl: `${conf.storefrontBase}/rastreio?order=${input.orderId}`,
        stops,
        supportEmail: conf.fromEmail,
      }),
    );
    const subj = emailSubjects(conf.locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: conf.fromEmail,
      subject: `${subj.shippingNotification} · ${input.orderCode}`,
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
    const conf = cfg();
    const isPt = conf.locale === 'pt-BR';
    const typeLabel = isPt
      ? (input.type === 'exchange' ? 'Troca' : input.type === 'warranty' ? 'Garantia' : 'Devolução')
      : (input.type === 'exchange' ? 'Exchange' : input.type === 'warranty' ? 'Warranty' : 'Refund');
    const html = await render(
      TradeApproved({
        storeName: conf.storeName,
        labelPdfUrl: input.labelPdfUrl ?? `${conf.storefrontBase}/conta`,
        supportEmail: conf.fromEmail,
      }),
    );
    const subj = emailSubjects(conf.locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: conf.fromEmail,
      subject: `${typeLabel} ${subj.tradeApproved} · ${input.orderCode}`,
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
    const conf = cfg();
    const cartCurrency: 'BRL' | 'USD' | 'EUR' = input.currency
      ?? (conf.currency === 'BRL' || conf.currency === 'USD' || conf.currency === 'EUR' ? conf.currency : 'USD');
    const subj = emailSubjects(conf.locale);
    const html = await render(
      RecoverCart({
        storeName: conf.storeName,
        customerName: input.customerName,
        items: input.items,
        subtotalCents: input.subtotalCents,
        currency: cartCurrency,
        cartUrl: input.cartUrl ?? `${conf.storefrontBase}/carrinho`,
        supportEmail: conf.fromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: conf.fromEmail,
      subject: `${subj.recoverCart} · ${conf.storeName}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendRecoverCartEmail failed');
    return { ok: false };
  }
}
