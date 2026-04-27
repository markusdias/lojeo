'use client';

/**
 * StickyBuyBar — barra fixa mobile-first que aparece quando o CTA principal
 * "Adicionar à sacola" sai do viewport. Match ref jewelry-v1 (PDP.jsx)
 * onde o usuário sempre tem ação primária acessível em mobile.
 *
 * Comportamento:
 *  - Aparece somente quando viewport <= 900px (mobile/tablet)
 *  - IntersectionObserver no botão principal: invisível => bar visível
 *  - Toca no botão da bar dispara o mesmo handler do CTA principal
 *  - Esgotado: mostra "Avise-me" simbólico (link para a área de restock)
 *
 * Tokens jewelry-v1 (var(--text-primary), var(--surface), var(--divider))
 */

import { useEffect, useRef, useState } from 'react';

interface StickyBuyBarProps {
  productName: string;
  priceLabel: string;
  isOutOfStock: boolean;
  onAddToCart: () => void;
  /** Selector ou ref do CTA principal — observa visibilidade. */
  watchSelector?: string;
}

export function StickyBuyBar({
  productName,
  priceLabel,
  isOutOfStock,
  onAddToCart,
  watchSelector = '[data-sticky-buy-anchor]',
}: StickyBuyBarProps) {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const observed = useRef<Element | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setVisible(false);
      return;
    }
    const el = document.querySelector(watchSelector);
    if (!el) return;
    observed.current = el;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // bar visível quando o CTA principal sai do viewport
        setVisible(!entry.isIntersecting);
      },
      { rootMargin: '0px 0px -40px 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile, watchSelector]);

  if (!isMobile) return null;

  return (
    <div
      role="region"
      aria-label="Barra de compra rápida"
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: 'var(--surface, #FAFAF6)',
        borderTop: '1px solid var(--divider)',
        boxShadow: '0 -8px 24px rgba(26,22,18,0.10)',
        padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 12,
        alignItems: 'center',
        transform: visible ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 220ms var(--ease-out, ease)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {productName}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}
        >
          {priceLabel}
        </p>
      </div>

      <button
        type="button"
        onClick={onAddToCart}
        disabled={isOutOfStock}
        style={{
          padding: '14px 22px',
          fontSize: 14,
          fontWeight: 500,
          background: isOutOfStock ? 'var(--surface-sunken)' : 'var(--text-primary)',
          color: isOutOfStock ? 'var(--text-muted)' : 'var(--text-on-dark)',
          border: 'none',
          borderRadius: 8,
          cursor: isOutOfStock ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {isOutOfStock ? 'Esgotado' : 'Adicionar à sacola'}
      </button>
    </div>
  );
}
