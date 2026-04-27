// Meta Conversions API server-side — bypass iOS/ATT/ad-blocker.
//
// Doc: https://developers.facebook.com/docs/marketing-api/conversions-api
//
// Sem `accessToken` ou `pixelId`: retorna { ok: false, mocked: true } pra preservar
// fluxo storefront em modo simulado. Hash SHA256 obrigatório em email/phone (PII).
//
// Tenant config:
//   tenant.config.pixels.metaPixelId
//   tenant.config.pixels.metaConversionsApiToken (sentinel-masked)

import { logger } from '@lojeo/logger';
import { createHash } from 'crypto';

export interface MetaUserData {
  email?: string | null;          // sera hashed
  phone?: string | null;          // sera hashed (E.164 sem '+')
  externalId?: string | null;     // userId/orderId — sera hashed
  clientIp?: string | null;
  clientUserAgent?: string | null;
  fbc?: string | null;            // _fbc cookie
  fbp?: string | null;            // _fbp cookie
}

export interface MetaCustomData {
  currency?: string;
  value?: number;                 // em moeda (não cents)
  contentIds?: string[];
  contents?: Array<{ id: string; quantity: number; item_price?: number }>;
  contentType?: 'product' | 'product_group';
  numItems?: number;
  orderId?: string;
}

export interface MetaConversionInput {
  pixelId: string;
  accessToken: string;
  /** Evento padrão: Purchase, AddToCart, ViewContent, etc. */
  eventName: string;
  eventTime?: number;             // unix seconds
  eventId?: string;               // dedup com pixel client-side
  eventSourceUrl?: string;
  actionSource?: 'website' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  testEventCode?: string;         // pra Test Events Manager
  userData?: MetaUserData;
  customData?: MetaCustomData;
}

export interface MetaConversionResult {
  ok: boolean;
  mocked: boolean;
  eventsReceived?: number;
  fbtrace_id?: string;
}

/**
 * Hash SHA256 lowercase hex — Meta exige PII hashed.
 * Email: trim + lowercase. Phone: digits-only.
 */
export function hashSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  // E.164 sem '+', sem espaços/parens/hífens
  return phone.replace(/[^\d]/g, '');
}

function buildUserData(u: MetaUserData | undefined): Record<string, unknown> {
  if (!u) return {};
  const out: Record<string, unknown> = {};
  if (u.email) out.em = [hashSha256(normalizeEmail(u.email))];
  if (u.phone) out.ph = [hashSha256(normalizePhone(u.phone))];
  if (u.externalId) out.external_id = [hashSha256(u.externalId)];
  if (u.clientIp) out.client_ip_address = u.clientIp;
  if (u.clientUserAgent) out.client_user_agent = u.clientUserAgent;
  if (u.fbc) out.fbc = u.fbc;
  if (u.fbp) out.fbp = u.fbp;
  return out;
}

export async function sendMetaConversion(input: MetaConversionInput): Promise<MetaConversionResult> {
  if (!input.pixelId || !input.accessToken) {
    return { ok: false, mocked: true };
  }
  try {
    const eventTime = input.eventTime ?? Math.floor(Date.now() / 1000);
    const event: Record<string, unknown> = {
      event_name: input.eventName,
      event_time: eventTime,
      action_source: input.actionSource ?? 'website',
      user_data: buildUserData(input.userData),
    };
    if (input.eventId) event.event_id = input.eventId;
    if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
    if (input.customData) {
      const cd: Record<string, unknown> = {};
      if (input.customData.currency) cd.currency = input.customData.currency;
      if (input.customData.value !== undefined) cd.value = input.customData.value;
      if (input.customData.contentIds) cd.content_ids = input.customData.contentIds;
      if (input.customData.contents) cd.contents = input.customData.contents;
      if (input.customData.contentType) cd.content_type = input.customData.contentType;
      if (input.customData.numItems !== undefined) cd.num_items = input.customData.numItems;
      if (input.customData.orderId) cd.order_id = input.customData.orderId;
      event.custom_data = cd;
    }

    const body: Record<string, unknown> = { data: [event] };
    if (input.testEventCode) body.test_event_code = input.testEventCode;

    const url = `https://graph.facebook.com/v18.0/${encodeURIComponent(input.pixelId)}/events?access_token=${encodeURIComponent(input.accessToken)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      logger.warn({ status: r.status, body: text.slice(0, 500) }, 'meta capi failed');
      return { ok: false, mocked: false };
    }
    const data = (await r.json().catch(() => ({}))) as { events_received?: number; fbtrace_id?: string };
    return {
      ok: true,
      mocked: false,
      eventsReceived: data.events_received,
      fbtrace_id: data.fbtrace_id,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'sendMetaConversion threw');
    return { ok: false, mocked: false };
  }
}

export interface MetaPurchaseHookInput {
  pixelId?: string | null;
  accessToken?: string | null;
  orderId: string;
  orderTotalCents: number;
  currency: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  contentIds?: string[];
  numItems?: number;
  eventSourceUrl?: string;
  clientIp?: string | null;
  clientUserAgent?: string | null;
}

/**
 * Convenience wrapper para evento Purchase no checkout.
 * Sem pixelId/accessToken: mocked (no-op observability).
 */
export async function sendMetaPurchase(input: MetaPurchaseHookInput): Promise<MetaConversionResult> {
  if (!input.pixelId || !input.accessToken) {
    return { ok: false, mocked: true };
  }
  return sendMetaConversion({
    pixelId: input.pixelId,
    accessToken: input.accessToken,
    eventName: 'Purchase',
    eventId: `order-${input.orderId}`,
    eventSourceUrl: input.eventSourceUrl,
    actionSource: 'website',
    userData: {
      email: input.customerEmail,
      phone: input.customerPhone,
      externalId: input.orderId,
      clientIp: input.clientIp,
      clientUserAgent: input.clientUserAgent,
    },
    customData: {
      currency: input.currency,
      value: input.orderTotalCents / 100,
      contentIds: input.contentIds,
      numItems: input.numItems,
      orderId: input.orderId,
    },
  });
}
