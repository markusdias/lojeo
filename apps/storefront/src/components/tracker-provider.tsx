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
  }, []);

  return <TrackerCtx.Provider value={trackerRef.current}>{children}</TrackerCtx.Provider>;
}
