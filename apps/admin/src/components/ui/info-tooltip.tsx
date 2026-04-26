'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface InfoTooltipProps {
  text: string;
  /** Optional accessible label override; defaults to "Mais informações". */
  label?: string;
}

/**
 * InfoTooltip — small (?) icon next to a label that reveals a floating
 * help bubble on hover/focus. Used to add contextual microcopy ("fator
 * moleza") in admin forms without cluttering the layout.
 *
 * Accessibility:
 * - Trigger is a real <button> reachable by keyboard.
 * - Bubble has role="tooltip" and is linked via aria-describedby.
 * - Closes on mouseleave, blur, and Escape key.
 */
export function InfoTooltip({ text, label = 'Mais informações' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useRef(`tip-${Math.random().toString(36).slice(2, 10)}`);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [open]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      (e.currentTarget as HTMLButtonElement).blur();
    }
  }

  return (
    <span
      ref={wrapperRef}
      style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, verticalAlign: 'middle' }}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId.current : undefined}
        onMouseEnter={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1px solid var(--border-strong, #D4D4D4)',
          background: 'var(--bg-subtle, #F5F5F5)',
          color: 'var(--fg-secondary, #737373)',
          fontSize: 11,
          lineHeight: '14px',
          fontWeight: 600,
          cursor: 'help',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={tooltipId.current}
          role="tooltip"
          style={{
            position: 'absolute',
            top: -4,
            left: '100%',
            transform: 'translate(8px, -100%)',
            zIndex: 50,
            minWidth: 220,
            maxWidth: 320,
            background: 'var(--surface, #FFFFFF)',
            color: 'var(--fg, #0A0A0A)',
            border: '1px solid var(--border, #E5E5E5)',
            boxShadow: 'var(--shadow-md, 0 4px 8px -2px rgba(10,10,10,0.06), 0 2px 4px -2px rgba(10,10,10,0.04))',
            borderRadius: 8,
            padding: '8px 10px',
            fontSize: 12,
            lineHeight: 1.45,
            fontWeight: 400,
            whiteSpace: 'normal',
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

export default InfoTooltip;
