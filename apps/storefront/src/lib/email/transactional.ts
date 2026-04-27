// Transactional emails — render React Email template + sendEmail dual mode.
//
// Sem RESEND_API_KEY: sendEmail loga e retorna {delivered: false} (mock).
// Com key: send real via Resend API.

import { sendEmail, render, OrderConfirmation, Welcome, PixGenerated, BoletoGenerated, getStoreEmailConfig, emailSubjects, type OrderItem } from '@lojeo/email';
import { logger } from '@lojeo/logger';
import { formatMoney, asSupportedCurrency } from '@lojeo/engine';

function cfg() { return getStoreEmailConfig(); }

interface PixEmailInput {
  customerEmail: string;
  orderCode: string;
  amountCents: number;
  qrCodeBase64: string;
  pixCopyPaste: string;
  expiresInLabel?: string;
}

function fmtBrlAmount(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}

interface BoletoEmailInput {
  customerEmail: string;
  orderCode: string;
  amountCents: number;
  boletoUrl: string;
  barcode: string;
  expiresInLabel?: string;
}

export async function sendBoletoGeneratedEmail(input: BoletoEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail || !input.boletoUrl) return { ok: false };
  try {
    const html = await render(
      BoletoGenerated({
        storeName: cfg().storeName,
        boletoUrl: input.boletoUrl,
        barcode: input.barcode,
        amount: fmtBrlAmount(input.amountCents),
        expiresInLabel: input.expiresInLabel ?? '3 dias úteis',
        supportEmail: cfg().fromEmail,
      }),
    );
    const subj = emailSubjects(cfg().locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject: `${subj.boletoGenerated} · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendBoletoGeneratedEmail failed');
    return { ok: false };
  }
}

export async function sendPixGeneratedEmail(input: PixEmailInput): Promise<{ ok: boolean }> {
  if (!input.customerEmail) return { ok: false };
  try {
    const html = await render(
      PixGenerated({
        storeName: cfg().storeName,
        qrImageUrl: input.qrCodeBase64
          ? `data:image/png;base64,${input.qrCodeBase64}`
          : '',
        pixCopyPaste: input.pixCopyPaste,
        amount: fmtBrlAmount(input.amountCents),
        expiresInLabel: input.expiresInLabel ?? '30 minutos',
        supportEmail: cfg().fromEmail,
      }),
    );
    const subj = emailSubjects(cfg().locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject: `${subj.pixGenerated} · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendPixGeneratedEmail failed');
    return { ok: false };
  }
}

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

function fmtCurrency(cents: number, currency: string): string {
  return formatMoney(cents, asSupportedCurrency(currency));
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
    const subj = emailSubjects(cfg().locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: cfg().fromEmail,
      subject: `${subj.welcome} ${cfg().storeName}`,
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
    const conf = cfg();
    const fmt = (cents: number) => fmtCurrency(cents, conf.currency);
    const html = await render(
      OrderConfirmation({
        storeName: input.storeName,
        customerName: input.customerName,
        orderCode: input.orderCode,
        items: input.items,
        subtotal: fmt(input.subtotalCents),
        shippingLabel: input.shippingLabel,
        shippingValue: fmt(input.shippingCents),
        total: fmt(input.totalCents),
        trackUrl: `${input.storeBaseUrl}/rastreio?order=${input.orderId}`,
        supportEmail: input.storeFromEmail,
      }),
    );
    const subj = emailSubjects(conf.locale);
    const result = await sendEmail({
      to: input.customerEmail,
      from: input.storeFromEmail ?? `no-reply@lojeo.app`,
      subject: `${subj.orderConfirmed} · ${input.orderCode}`,
      html,
    });
    return { ok: result.delivered, mocked: !process.env.RESEND_API_KEY };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendOrderConfirmationEmail failed');
    return { ok: false, mocked: false };
  }
}
