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
        width: 64, height: 64, borderRadius: 999,
        background: 'var(--accent-soft)', display: 'grid', placeItems: 'center',
        margin: '0 auto 24px',
      }}>
        <Icon name="check" size={28} style={{ color: 'var(--accent)' }} />
      </div>

      <p className="eyebrow" style={{ marginBottom: 8 }}>Pedido recebido</p>
      <h1 style={{ marginBottom: 8 }}>{state.orderNumber}</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 40 }}>
        Obrigada pela sua compra!
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
        {[
          { icon: 'check', text: 'Email de confirmação será enviado em breve' },
          { icon: 'truck', text: `Frete: ${state.shipping?.label ?? 'a confirmar'}` },
          { icon: 'shield', text: 'Garantia de 12 meses incluída' },
        ].map(i => (
          <div key={i.text} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface-sunken)', borderRadius: 4, textAlign: 'left' }}>
            <Icon name={i.icon as 'check' | 'truck' | 'shield'} size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{i.text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Link
          href="/produtos"
          onClick={() => reset()}
          style={{
            display: 'inline-block', padding: '14px 32px',
            background: 'var(--text-primary)', color: 'var(--text-on-dark)',
            fontSize: 14, fontWeight: 500, borderRadius: 8,
          }}
        >
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}
