'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCheckout } from '../../../components/checkout/checkout-provider';
import { useTracker } from '../../../components/tracker-provider';
import { Icon } from '../../../components/ui/icon';

export default function ConfirmacaoPage() {
  const { state, reset } = useCheckout();
  const tracker = useTracker();

  useEffect(() => {
    if (!state.orderId) return;
    tracker?.track({
      type: 'checkout_step_complete',
      entityType: 'order',
      entityId: state.orderId,
      metadata: { step: 4, orderNumber: state.orderNumber, method: state.paymentMethod },
    });
  }, [state.orderId, state.orderNumber, state.paymentMethod, tracker]);

  if (!state.orderId || !state.orderNumber) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</p>
        <Link href="/produtos" style={{ color: 'var(--accent)' }}>Ver produtos</Link>
      </div>
    );
  }

  const isPix = state.paymentMethod === 'pix';
  const isBoleto = state.paymentMethod === 'boleto';

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '40px 0 80px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 999,
        background: '#EEF2E8', display: 'grid', placeItems: 'center',
        margin: '0 auto 24px',
      }}>
        <Icon name="check" size={32} style={{ color: 'var(--success)' }} />
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1.05, margin: 0 }}>
        Pedido confirmado.
      </h1>
      <p style={{ fontSize: 17, color: 'var(--text-secondary)', marginTop: 12, marginBottom: 40 }}>
        Recebemos seu pedido <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{state.orderNumber}</strong>. Enviamos um email com os detalhes.
      </p>

      {isPix && (
        <div style={{
          padding: 24, border: '1px solid var(--divider)', borderRadius: 8, marginBottom: 32, textAlign: 'left',
        }}>
          <h3 style={{ marginBottom: 12 }}>Pague via Pix</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            QR code será gerado pelo Mercado Pago após integração (Sprint 3 completo). Por enquanto, entre em contato via WhatsApp para finalizar o pagamento.
          </p>
          <div style={{
            width: 160, height: 160, background: 'var(--surface-sunken)',
            margin: '0 auto', borderRadius: 8, display: 'grid', placeItems: 'center',
          }}>
            <span style={{ fontSize: 40, color: 'var(--text-muted)' }}>◉</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
            QR code do Pix — disponível após integração MP
          </p>
        </div>
      )}

      {isBoleto && (
        <div style={{
          padding: 24, border: '1px solid var(--divider)', borderRadius: 8, marginBottom: 32, textAlign: 'left',
        }}>
          <h3 style={{ marginBottom: 12 }}>Seu boleto</h3>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            O boleto será gerado via Mercado Pago após integração (Sprint 3 completo). Você receberá o link por email assim que disponível.
          </p>
        </div>
      )}

      {/* Próximos passos — paridade ref Checkout.jsx */}
      <div style={{
        background: 'var(--surface-sunken)', borderRadius: 8,
        padding: 28, marginTop: 8, marginBottom: 36, textAlign: 'left',
      }}>
        <div className="eyebrow" style={{
          fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--text-secondary)', marginBottom: 14,
        }}>
          Próximos passos
        </div>
        {[
          {
            n: '1',
            t: 'Pagamento',
            d: isPix
              ? 'Aguardamos a confirmação do Pix'
              : isBoleto
                ? 'Aguardamos a compensação do boleto · até 2 dias úteis'
                : 'Aguardamos a confirmação do pagamento',
          },
          { n: '2', t: 'Preparação', d: 'Sua peça é finalizada à mão · 3 a 5 dias úteis' },
          { n: '3', t: 'Envio', d: `Você recebe o código de rastreio por email${state.shipping?.label ? ` · ${state.shipping.label}` : ''}` },
          { n: '4', t: 'Entrega', d: 'Em embalagem presente · garantia de 12 meses incluída' },
        ].map(s => (
          <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '30px 1fr', gap: 14, padding: '10px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--accent)' }}>{s.n}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{s.t}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{s.d}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link
          href="/conta/pedidos"
          style={{
            display: 'inline-block', padding: '14px 24px',
            background: 'var(--text-primary)', color: 'var(--text-on-dark)',
            fontSize: 14, fontWeight: 500, borderRadius: 8, textDecoration: 'none',
          }}
        >
          Acompanhar pedido
        </Link>
        <Link
          href="/produtos"
          onClick={() => reset()}
          style={{
            display: 'inline-block', padding: '14px 24px',
            background: 'transparent', color: 'var(--text-primary)',
            border: '1px solid var(--divider)',
            fontSize: 14, fontWeight: 500, borderRadius: 8, textDecoration: 'none',
          }}
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
