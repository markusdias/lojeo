'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trackPixelEvent } from '../marketing/pixel-events';

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  imageUrl?: string;
  priceCents: number;
  qty: number;
  options?: Record<string, string>;
}

interface CartState {
  items: CartItem[];
  count: number;
  subtotalCents: number;
}

interface CartActions {
  addItem(item: Omit<CartItem, 'qty'> & { qty?: number }): void;
  removeItem(id: string): void;
  updateQty(id: string, qty: number): void;
  clear(): void;
}

const CartCtx = createContext<CartState & CartActions>({
  items: [], count: 0, subtotalCents: 0,
  addItem: () => {}, removeItem: () => {}, updateQty: () => {}, clear: () => {},
});

export function useCart() {
  return useContext(CartCtx);
}

const STORAGE_KEY = 'lojeo_cart';

function loadCart(): CartItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  const persist = useCallback((next: CartItem[]) => {
    setItems(next);
    saveCart(next);
  }, []);

  const addItem = useCallback((incoming: Omit<CartItem, 'qty'> & { qty?: number }) => {
    const qty = incoming.qty ?? 1;
    setItems(prev => {
      const existing = prev.find(i => i.id === incoming.id);
      const next = existing
        ? prev.map(i => i.id === incoming.id ? { ...i, qty: i.qty + qty } : i)
        : [...prev, { ...incoming, qty }];
      saveCart(next);
      return next;
    });
    // Pixel event: AddToCart
    trackPixelEvent('AddToCart', {
      value: incoming.priceCents * qty,
      currency: 'BRL',
      content_ids: [incoming.productId],
      content_type: 'product',
      contents: [{ id: incoming.productId, quantity: qty, item_price: incoming.priceCents }],
      num_items: qty,
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems(prev => {
      const next = qty <= 0
        ? prev.filter(i => i.id !== id)
        : prev.map(i => i.id === id ? { ...i, qty } : i);
      saveCart(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => persist([]), [persist]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, count, subtotalCents, addItem, removeItem, updateQty, clear }}>
      {children}
    </CartCtx.Provider>
  );
}
