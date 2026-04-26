import type { ConsentState, TrackEventInput, TrackPayload } from './types';

const STORAGE_KEY = 'lojeo_anon_id';
const CONSENT_KEY = 'lojeo_consent';

function uuidv4(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getAnonId(): string {
  if (typeof localStorage === 'undefined') return uuidv4();
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function getConsent(): ConsentState {
  if (typeof localStorage === 'undefined') {
    return { essential: true, analytics: false, marketing: false };
  }
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return { essential: true, analytics: false, marketing: false };
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      essential: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
    };
  } catch {
    return { essential: true, analytics: false, marketing: false };
  }
}

export function setConsent(c: Partial<ConsentState>): void {
  const next: ConsentState = {
    essential: true,
    analytics: !!c.analytics,
    marketing: !!c.marketing,
  };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lojeo:consent-change', { detail: next }));
    }
  }
}

export interface TrackerConfig {
  endpoint?: string;
  tenantId: string;
  flushIntervalMs?: number;
  maxBuffer?: number;
}

const ANALYTICS_EVENTS: ReadonlySet<string> = new Set([
  'product_scroll',
  'gallery_image_index',
  'video_watched_full',
  'search_performed',
  'search_clicked',
  'external_referrer',
]);

export class Tracker {
  private buffer: Array<TrackEventInput & { ts: number }> = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly endpoint: string;
  private readonly maxBuffer: number;

  constructor(private readonly cfg: TrackerConfig) {
    this.endpoint = cfg.endpoint ?? '/api/track';
    this.maxBuffer = cfg.maxBuffer ?? 20;
    if (typeof window !== 'undefined') {
      this.start();
      window.addEventListener('beforeunload', () => this.flush(true));
    }
  }

  private start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.cfg.flushIntervalMs ?? 5000);
  }

  track(ev: TrackEventInput): void {
    const consent = getConsent();
    if (ANALYTICS_EVENTS.has(ev.type) && !consent.analytics) return;
    this.buffer.push({ ...ev, ts: Date.now() });
    if (this.buffer.length >= this.maxBuffer) void this.flush();
  }

  async flush(useBeacon = false): Promise<void> {
    if (this.buffer.length === 0) return;
    const events = this.buffer;
    this.buffer = [];
    const payload: TrackPayload = {
      tenantId: this.cfg.tenantId,
      anonymousId: getAnonId(),
      events,
      consent: getConsent(),
    };
    const body = JSON.stringify(payload);
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, body);
      return;
    }
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch {
      this.buffer.unshift(...events);
    }
  }
}

export { getAnonId, getConsent };
