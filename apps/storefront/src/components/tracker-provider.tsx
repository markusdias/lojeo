'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { Tracker, getAnonId } from '@lojeo/tracking/client';

const TrackerCtx = createContext<Tracker | null>(null);

export function useTracker(): Tracker | null {
  return useContext(TrackerCtx);
}

interface TrackerProviderProps {
  children: React.ReactNode;
  tenantId: string;
  endpoint?: string;
  userId?: string | null;
}

export function TrackerProvider({ children, tenantId, endpoint, userId }: TrackerProviderProps) {
  const trackerRef = useRef<Tracker | null>(null);

  if (!trackerRef.current) {
    trackerRef.current = new Tracker({ tenantId, endpoint });
  }

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    tracker.track({ type: 'page_view', entityType: 'page', entityId: window.location.pathname });

    const ref = document.referrer;
    if (ref && new URL(ref).hostname !== window.location.hostname) {
      const refKey = `lojeo_ext_ref_${tenantId}`;
      if (!sessionStorage.getItem(refKey)) {
        sessionStorage.setItem(refKey, '1');
        tracker.track({
          type: 'external_referrer',
          entityType: 'page',
          entityId: window.location.pathname,
          metadata: { referrer: ref },
        });
      }
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    if (utmSource) {
      sessionStorage.setItem('lojeo_utm', JSON.stringify({
        source: utmSource,
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
      }));
    }
  }, [tenantId]);

  // Identity link: when user logs in, backfill anonymousId trail with userId. Idempotente via flag.
  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined') return;
    const linkedKey = `lojeo_identity_linked_${tenantId}_${userId}`;
    if (localStorage.getItem(linkedKey)) return;
    const anonymousId = getAnonId();
    if (!anonymousId) return;
    fetch('/api/track/identify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tenantId, anonymousId }),
      keepalive: true,
    })
      .then((r) => {
        if (r.ok) localStorage.setItem(linkedKey, '1');
      })
      .catch(() => undefined);
  }, [tenantId, userId]);

  return <TrackerCtx.Provider value={trackerRef.current}>{children}</TrackerCtx.Provider>;
}
