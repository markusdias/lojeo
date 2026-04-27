'use client';

import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCheckout } from '../../../components/checkout/checkout-provider';
import { useTracker } from '../../../components/tracker-provider';
import { Icon } from '../../../components/ui/icon';

interface PixData {
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string | null;
}

interface FetchedOrder {
  id: string;
  orderNumber: string;
  paymentMethod: string | null;
  status: string;
  pix: PixData | null;
}

function ConfirmacaoInner() {
  const { state, reset } = useCheckout();
  const tracker = useTracker();
  const params = useSearchParams();
  const queryOrderId = params.get('order');
  const [fetched, setFetched] = useState<FetchedOrder | null>(null);
  const [loading, setLoading] = useState(false);

  // MP-redirect-flow: chega aqui sem provider state (sessão diferente). Fetch order.
  // Lê metadata.pix pra renderizar QR.
  useEffect(() => {
    if (state.orderId || !queryOrderId) return;
    setLoading(true);
    fetch(`/api/orders?id=${encodeURIComponent(queryOrderId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: {
        id?: string;
        orderNumber?: string;
        paymentMethod?: string | null;
        status?: string;
        metadata?: { pix?: PixData | null };
      } | null) => {
        if (d?.id) {
          setFetched({
            id: d.id,
            orderNumber: d.orderNumber ?? '—',
            paymentMethod: d.paymentMethod ?? null,
            status: d.status ?? 'pending',
            pix: d.metadata?.pix ?? null,
          });
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [state.orderId, queryOrderId]);

  const orderId = state.orderId ?? fetched?.id ?? null;
  const orderNumber = state.orderNumber ?? fetched?.orderNumber ?? null;
  const paymentMethod = state.paymentMethod ?? fetched?.paymentMethod ?? null;
  const pix = fetched?.pix ?? null;
  const orderStatus = fetched?.status ?? 'pending';

  useEffect(() => {
    if (!orderId) return;
    tracker?.track({
      type: 'checkout_step_complete',
      entityType: 'order',
      entityId: orderId,
      metadata: { step: 4, orderNumber, method: paymentMethod },
    });
  }, [orderId, orderNumber, paymentMethod, tracker]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Carregando pedido…</p>
      </div>
    );
  }

  if (!orderId || !orderNumber) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <p style={{ color: 'var(--text-muted)' }}>Nenhum pedido encontrado.</p>
        <Link href="/produtos" style={{ color: 'var(--accent)' }}>Ver produtos</Link>
      </div>
    );
  }

  const isPix = paymentMethod === 'pix';
  const isBoleto = paymentMethod === 'boleto';

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
        Recebemos seu pedido <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{orderNumber}</strong>. Enviamos um email com os detalhes.
      </p>

      {isPix && (
        <PixSection pix={pix} orderStatus={orderStatus} orderId={orderId} setFetched={setFetched} />
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

interface PixSectionProps {
  pix: PixData | null;
  orderStatus: string;
  orderId: string;
  setFetched: React.Dispatch<React.SetStateAction<FetchedOrder | null>>;
}

function PixSection({ pix, orderStatus, orderId, setFetched }: PixSectionProps) {
  const [copied, setCopied] = useState(false);

  // Polling status: a cada 5s, verifica se MP webhook atualizou status pra paid.
  // Para quando paid/cancelled.
  useEffect(() => {
    if (orderStatus === 'paid' || orderStatus === 'cancelled') return;
    if (!orderId) return;
    const id = setInterval(() => {
      fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { status?: string; metadata?: { pix?: PixData | null }; orderNumber?: string; paymentMethod?: string | null } | null) => {
          if (d?.status && d.status !== orderStatus) {
            setFetched((prev) => prev ? { ...prev, status: d.status ?? prev.status } : prev);
          }
        })
        .catch(() => null);
    }, 5000);
    return () => clearInterval(id);
  }, [orderStatus, orderId, setFetched]);

  if (orderStatus === 'paid') {
    return (
      <div style={{
        padding: 24, border: '1px solid var(--success, #166534)',
        background: 'var(--surface, #fff)', borderRadius: 8, marginBottom: 32,
      }}>
        <strong style={{ fontSize: 18, color: 'var(--success, #166534)' }}>Pagamento confirmado ✓</strong>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
          Recebemos seu Pix. Em breve enviaremos email com NF-e e código de rastreio.
        </p>
      </div>
    );
  }

  async function copyPix() {
    if (!pix?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* */ }
  }

  return (
    <div style={{
      padding: 24, border: '1px solid var(--divider)', borderRadius: 8, marginBottom: 32, textAlign: 'left',
    }}>
      <h3 style={{ marginBottom: 12 }}>Pague via Pix</h3>
      {pix?.qrCodeBase64 ? (
        <>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Escaneie o QR code abaixo no app do seu banco. Ou copie o código e cole na opção Pix copia-e-cola.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            width={200}
            height={200}
            style={{ display: 'block', margin: '0 auto', borderRadius: 8 }}
          />
          {pix.qrCode && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={copyPix}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: copied ? 'var(--success, #166534)' : 'var(--text-primary, #1A1612)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Código copiado' : 'Copiar código Pix'}
              </button>
              <textarea
                readOnly
                value={pix.qrCode}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: 8,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  border: '1px solid var(--divider)',
                  borderRadius: 6,
                  resize: 'vertical',
                  minHeight: 60,
                  background: 'var(--surface-sunken, #FAF6EE)',
                }}
              />
            </div>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
            Aguardando pagamento — esta página atualiza automaticamente.
          </p>
        </>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Pix em modo simulado (Mercado Pago não conectado). Entre em contato via WhatsApp para finalizar manualmente.
        </p>
      )}
    </div>
  );
}

export default function ConfirmacaoPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '80px 0' }}>Carregando…</div>}>
      <ConfirmacaoInner />
    </Suspense>
  );
}
