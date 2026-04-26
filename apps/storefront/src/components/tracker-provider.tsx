'use client';

import { createContext, useContext, useEffect, useRef } from 'react';
import { Tracker } from '@lojeo/tracking';

const TrackerCtx = createContext<Tracker | null>(null);

export function useTracker(): Tracker | null {
  return useContext(TrackerCtx);
}

interface TrackerProviderProps {
  children: React.ReactNode;
  tenantId: string;
  endpoint?: string;
}

export function TrackerProvider({ children, tenantId, endpoint }: TrackerProviderProps) {
  const trackerRef = useRef<Tracker | null>(null);

  if (!trackerRef.current) {
    trackerRef.current = new Tracker({ tenantId, endpoint });
  }

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    tracker.track({ type: 'page_view', entityType: 'page', entityId: window.location.pathname });

    // Track external referrer once per session
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

    // Capture UTM params from URL — persist for order attribution
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

  return <TrackerCtx.Provider value={trackerRef.current}>{children}</TrackerCtx.Provider>;
}
