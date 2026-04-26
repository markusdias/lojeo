/**
 * Pixel events — wrapper para disparar eventos em todos os pixels ativos.
 *
 * Uso:
 *   import { trackPixelEvent } from './pixel-events';
 *   trackPixelEvent('AddToCart', { value: 2990, currency: 'BRL', content_ids: ['p123'] });
 *
 * Respeita consent LGPD: se marketing=false, não dispara nada.
 */

export type PixelEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Search'
  | 'AddToWishlist';

export interface PixelEventData {
  value?: number;            // valor monetário (em moeda BRL)
  currency?: string;         // 'BRL'
  content_ids?: string[];    // SKUs/IDs
  content_type?: string;     // 'product'
  contents?: Array<{ id: string; quantity?: number; item_price?: number }>;
  num_items?: number;
  search_string?: string;
  order_id?: string;
}

declare global {
  interface Window {
    fbq?: (action: string, eventName: string, data?: Record<string, unknown>) => void;
    gtag?: (command: string, target: string, params?: Record<string, unknown>) => void;
    ttq?: { track: (eventName: string, data?: Record<string, unknown>) => void };
    clarity?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function hasMarketingConsent(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const raw = localStorage.getItem('lojeo_consent');
    if (!raw) return false;
    const data = JSON.parse(raw) as { marketing?: boolean };
    return Boolean(data.marketing);
  } catch { return false; }
}

// Mapping Lojeo → vendor-specific event names
const GA_EVENT_MAP: Record<PixelEventName, string> = {
  PageView: 'page_view',
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  AddPaymentInfo: 'add_payment_info',
  Purchase: 'purchase',
  Search: 'search',
  AddToWishlist: 'add_to_wishlist',
};

const TIKTOK_EVENT_MAP: Record<PixelEventName, string> = {
  PageView: 'Pageview',
  ViewContent: 'ViewContent',
  AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout',
  AddPaymentInfo: 'AddPaymentInfo',
  Purchase: 'CompletePayment',
  Search: 'Search',
  AddToWishlist: 'AddToWishlist',
};

export function trackPixelEvent(name: PixelEventName, data: PixelEventData = {}): void {
  if (typeof window === 'undefined') return;
  if (!hasMarketingConsent()) return;

  // Meta Pixel — names já no padrão Meta
  if (typeof window.fbq === 'function') {
    try {
      window.fbq('track', name, {
        value: data.value ? data.value / 100 : undefined,
        currency: data.currency,
        content_ids: data.content_ids,
        content_type: data.content_type,
        contents: data.contents,
        num_items: data.num_items,
      });
    } catch { /* fbq pode estar parcialmente carregado */ }
  }

  // Google Analytics 4
  if (typeof window.gtag === 'function') {
    const gaName = GA_EVENT_MAP[name];
    try {
      const gaParams: Record<string, unknown> = {};
      if (data.value !== undefined) gaParams.value = data.value / 100;
      if (data.currency) gaParams.currency = data.currency;
      if (data.contents) {
        gaParams.items = data.contents.map(c => ({
          item_id: c.id,
          quantity: c.quantity ?? 1,
          price: c.item_price ? c.item_price / 100 : undefined,
        }));
      }
      if (data.search_string) gaParams.search_term = data.search_string;
      if (data.order_id) gaParams.transaction_id = data.order_id;
      window.gtag('event', gaName, gaParams);
    } catch { /* gtag pode estar parcialmente carregado */ }
  }

  // TikTok Pixel
  if (window.ttq && typeof window.ttq.track === 'function') {
    const ttkName = TIKTOK_EVENT_MAP[name];
    try {
      window.ttq.track(ttkName, {
        value: data.value ? data.value / 100 : undefined,
        currency: data.currency,
        content_id: data.content_ids?.[0],
        content_type: data.content_type,
        quantity: data.num_items,
      });
    } catch { /* ttq pode estar parcialmente carregado */ }
  }

  // GTM dataLayer (caso GTM esteja sendo usado para custom triggers)
  if (Array.isArray(window.dataLayer)) {
    try {
      window.dataLayer.push({ event: name, ...data });
    } catch { /* */ }
  }
}
