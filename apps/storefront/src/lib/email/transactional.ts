// Transactional emails — render React Email template + sendEmail dual mode.
//
// Sem RESEND_API_KEY: sendEmail loga e retorna {delivered: false} (mock).
// Com key: send real via Resend API.

import { sendEmail, render, OrderConfirmation, Welcome, getStoreEmailConfig, type OrderItem } from '@lojeo/email';
import { logger } from '@lojeo/logger';

function cfg() { return getStoreEmailConfig(); }

interface OrderEmailInput {
  storeName: string;
  storeFromEmail?: string;
  customerName: string;
  customerEmail: string;
  orderCode: string;
  items: OrderItem[];
  subtotalCents: number;
  shippingCents: number;
  shippingLabel: string;
  totalCents: number;
  storeBaseUrl: string;
  orderId: string;
}

function fmtBrl(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}

interface WelcomeEmailInput {
  customerEmail: string;
  customerName: string;
}

export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail) return { ok: false };
  try {
    const html = await render(
      Welcome({
        storeName: cfg().storeName,
        customerName: input.customerName,
        loginUrl: `${cfg().storefrontBase}/conta`,
        supportEmail: cfg().fromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject: `Bem-vinda à ${cfg().storeName}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendWelcomeEmail failed');
    return { ok: false };
  }
}

export async function sendOrderConfirmationEmail(input: OrderEmailInput): Promise<{ ok: boolean; mocked: boolean }> {
  if (!input.customerEmail) {
    return { ok: false, mocked: false };
  }
  try {
    const html = await render(
      OrderConfirmation({
        storeName: input.storeName,
        customerName: input.customerName,
        orderCode: input.orderCode,
        items: input.items,
        subtotal: fmtBrl(input.subtotalCents),
        shippingLabel: input.shippingLabel,
        shippingValue: fmtBrl(input.shippingCents),
        total: fmtBrl(input.totalCents),
        trackUrl: `${input.storeBaseUrl}/rastreio?order=${input.orderId}`,
        supportEmail: input.storeFromEmail,
      }),
    );
    const result = await sendEmail({
      to: input.customerEmail,
      from: input.storeFromEmail ?? `no-reply@lojeo.app`,
      subject: `Pedido confirmado · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered, mocked: !process.env.RESEND_API_KEY };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendOrderConfirmationEmail failed');
    return { ok: false, mocked: false };
  }
}
