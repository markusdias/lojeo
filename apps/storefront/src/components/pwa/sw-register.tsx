'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;
    // Registrar com pequeno delay para não competir com hidratação inicial
    const timer = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch(() => null);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
