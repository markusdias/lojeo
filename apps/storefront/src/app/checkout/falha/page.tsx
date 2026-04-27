'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function FalhaContent() {
  const params = useSearchParams();
  const orderId = params.get('order');

  return (
    <div style={{ maxWidth: 540, margin: '80px auto', padding: '0 var(--sp-4, 16px)', textAlign: 'center' }}>
      <div
        aria-hidden
        style={{
          width: 72,
          height: 72,
          margin: '0 auto var(--sp-4, 16px)',
          borderRadius: '50%',
          background: 'var(--surface-subtle, #FAF6EE)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-secondary, #6B6055)',
          fontSize: 32,
        }}
      >
        ✕
      </div>

      <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: 'clamp(28px, 4vw, 40px)', margin: '0 0 var(--sp-3, 12px)', color: 'var(--text-primary, #1A1612)' }}>
        Não conseguimos finalizar
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-secondary, #6B6055)', margin: '0 auto var(--sp-6, 24px)', maxWidth: 420 }}>
        O pagamento foi recusado ou interrompido. Sua reserva de estoque foi liberada — você pode tentar de novo a qualquer momento.
      </p>

      <div style={{ display: 'flex', gap: 'var(--sp-3, 12px)', justifyContent: 'center', flexWrap: 'wrap' }}>
        {orderId ? (
          <Link
            href={`/checkout/pagamento?retry=${encodeURIComponent(orderId)}`}
            style={{
              display: 'inline-block',
              padding: 'var(--sp-3, 12px) var(--sp-5, 20px)',
              background: 'var(--text-primary, #1A1612)',
              color: 'var(--text-on-dark, #FAFAF6)',
              borderRadius: 'var(--r-sm, 4px)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Tentar novamente
          </Link>
        ) : (
          <Link
            href="/carrinho"
            style={{
              display: 'inline-block',
              padding: 'var(--sp-3, 12px) var(--sp-5, 20px)',
              background: 'var(--text-primary, #1A1612)',
              color: 'var(--text-on-dark, #FAFAF6)',
              borderRadius: 'var(--r-sm, 4px)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Voltar ao carrinho
          </Link>
        )}
        <Link
          href="/produtos"
          style={{
            display: 'inline-block',
            padding: 'var(--sp-3, 12px) var(--sp-5, 20px)',
            background: 'transparent',
            color: 'var(--text-primary, #1A1612)',
            border: '1px solid var(--divider, #E8E2D5)',
            borderRadius: 'var(--r-sm, 4px)',
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          Ver produtos
        </Link>
      </div>

      <p style={{ marginTop: 'var(--sp-6, 24px)', fontSize: 12, color: 'var(--text-muted, #9B9389)' }}>
        Precisa de ajuda?{' '}
        <Link href="/conta" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Falar com atendimento
        </Link>
      </p>
    </div>
  );
}

export default function FalhaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: 'center' }}>Carregando…</div>}>
      <FalhaContent />
    </Suspense>
  );
}
