'use client';

import { useEffect } from 'react';
import { useTracker } from '../../components/tracker-provider';

interface SearchTrackerProps {
  query: string;
  resultsCount: number;
}

export function SearchTracker({ query, resultsCount }: SearchTrackerProps) {
  const tracker = useTracker();

  useEffect(() => {
    if (!query.trim()) return;
    tracker?.track({
      type: 'search_performed',
      entityType: 'search',
      metadata: { query, resultsCount },
    });
  }, [query, resultsCount, tracker]);

  return null;
}
