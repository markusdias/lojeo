export type EventType =
  | 'page_view'
  | 'product_view'
  | 'product_scroll'
  | 'gallery_open'
  | 'gallery_image_index'
  | 'video_watched_full'
  | 'variant_selected'
  | 'cart_add'
  | 'cart_remove'
  | 'checkout_step_start'
  | 'checkout_step_complete'
  | 'search_performed'
  | 'search_clicked'
  | 'external_referrer';

export interface ConsentState {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

export interface TrackEventInput {
  type: EventType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackPayload {
  tenantId: string;
  anonymousId: string;
  sessionId?: string;
  userId?: string;
  events: Array<TrackEventInput & { ts: number }>;
  consent: ConsentState;
}
