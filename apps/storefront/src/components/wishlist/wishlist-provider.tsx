'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'lojeo_wishlist';

interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
  addedAt: number;
}

interface WishlistContextValue {
  items: WishlistItem[];
  has: (productId: string) => boolean;
  toggle: (item: Omit<WishlistItem, 'addedAt'>) => void;
  remove: (productId: string) => void;
  count: number;
}

const WishlistCtx = createContext<WishlistContextValue | null>(null);

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistCtx);
  if (!ctx) throw new Error('useWishlist must be inside WishlistProvider');
  return ctx;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as WishlistItem[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const has = useCallback((productId: string) => items.some(i => i.productId === productId), [items]);

  const toggle = useCallback((item: Omit<WishlistItem, 'addedAt'>) => {
    setItems(prev => {
      const exists = prev.some(i => i.productId === item.productId);
      return exists
        ? prev.filter(i => i.productId !== item.productId)
        : [...prev, { ...item, addedAt: Date.now() }];
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  }, []);

  return (
    <WishlistCtx.Provider value={{ items, has, toggle, remove, count: items.length }}>
      {children}
    </WishlistCtx.Provider>
  );
}
