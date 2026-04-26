'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface OrderRow {
  id: string;
  orderNumber: string | null;
  status: string;
  totalCents: number;
  createdAt: string;
  paymentMethod: string | null;
}

export interface WarrantyRow {
  orderItemId: string;
  productName: string;
  startsAt: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'none';
}

export interface TicketRow {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface Props {
  orders: OrderRow[];
  warranties: WarrantyRow[];
  tickets: TicketRow[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente', paid: 'Pago', processing: 'Processando',
  shipped: 'Enviado', delivered: 'Entregue', cancelled: 'Cancelado', refunded: 'Reembolsado',
};

const STATUS_BADGE: Record<string, string> = {
  pending: 'lj-badge-warning', paid: 'lj-badge-success', processing: 'lj-badge-info',
  shipped: 'lj-badge-info', delivered: 'lj-badge-success', cancelled: 'lj-badge-neutral', refunded: 'lj-badge-neutral',
};

const TICKET_STATUS_BADGE: Record<string, string> = {
  open: 'lj-badge-warning', in_progress: 'lj-badge-info', resolved: 'lj-badge-success', closed: 'lj-badge-neutral',
};

const TICKET_STATUS_LABEL: Record<string, string> = {
  open: 'Aberto', in_progress: 'Em andamento', resolved: 'Resolvido', closed: 'Fechado',
};

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

type TabKey = 'orders' | 'warranty' | 'tickets' | 'marketing' | 'notes';

export function CustomerTabs({ orders, warranties, tickets }: Props) {
  const [tab, setTab] = useState<TabKey>('orders');

  const TABS: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'orders', label: 'Pedidos', count: orders.length },
    { key: 'warranty', label: 'Garantias', count: warranties.length },
    { key: 'tickets', label: 'Tickets', count: tickets.length },
    { key: 'marketing', label: 'Marketing' },
    { key: 'notes', label: 'Notas internas' },
  ];

  return (
    <div>
      {/* Tab strip */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-4)',
        borderBottom: '1px solid var(--border)',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
      }}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 'var(--space-2) 0',
                borderBottom: active ? '2px solid var(--fg)' : '2px solid transparent',
                marginBottom: -1,
                fontSize: 'var(--text-body-s)',
                fontWeight: active ? 'var(--w-semibold)' : 'var(--w-medium)',
                color: active ? 'var(--fg)' : 'var(--fg-secondary)',
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span style={{
                  marginLeft: 6,
                  fontSize: 'var(--text-caption)',
                  color: 'var(--fg-muted)',
                  fontWeight: 'var(--w-regular)',
                }}>
                  · {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'orders' && (
        <div className="lj-card" style={{ overflow: 'hidden' }}>
          {orders.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Nenhum pedido encontrado.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-body-s)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-subtle)' }}>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>PEDIDO</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>DATA</th>
                  <th style={{ textAlign: 'left', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>STATUS</th>
                  <th style={{ textAlign: 'right', padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)', fontWeight: 'var(--w-medium)' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <Link href={`/pedidos/${o.id}`} className="mono" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 'var(--w-medium)' }}>
                        #{o.orderNumber ?? o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--fg-secondary)' }}>
                      {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                      <span className={`lj-badge ${STATUS_BADGE[o.status] ?? 'lj-badge-neutral'}`}>
                        <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', marginRight: 4 }} />
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="numeric" style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'right', fontWeight: 'var(--w-medium)' }}>
                      {fmt(o.totalCents ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'warranty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {warranties.length === 0 ? (
            <div className="lj-card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Nenhuma garantia ativa.</p>
            </div>
          ) : warranties.map(w => {
            const isExpiring = w.status === 'expiring_soon';
            const isExpired = w.status === 'expired';
            return (
              <div
                key={w.orderItemId}
                className="lj-card"
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  borderColor: isExpiring ? 'var(--warning)' : isExpired ? 'var(--error)' : 'var(--border)',
                  background: isExpiring ? 'var(--warning-soft)' : isExpired ? 'var(--error-soft)' : 'var(--bg-elevated)',
                }}
              >
                <div style={{ width: 40, height: 40, background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 'var(--w-medium)', fontSize: 'var(--text-body-s)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.productName}
                  </p>
                  <p className="caption">
                    Início: {new Date(w.startsAt).toLocaleDateString('pt-BR')}
                    {w.expiresAt && <> · Expira: {new Date(w.expiresAt).toLocaleDateString('pt-BR')}</>}
                  </p>
                </div>
                <span className={`lj-badge ${isExpired ? 'lj-badge-error' : isExpiring ? 'lj-badge-warning' : 'lj-badge-success'}`}>
                  {isExpired ? 'Expirada' : isExpiring ? `Expira em ${w.daysRemaining}d` : `${w.daysRemaining}d restantes`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'tickets' && (
        <div className="lj-card">
          {tickets.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Nenhum ticket aberto por essa cliente.</p>
            </div>
          ) : (
            <div>
              {tickets.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                  <span className={`lj-badge ${TICKET_STATUS_BADGE[t.status] ?? 'lj-badge-neutral'}`}>
                    {TICKET_STATUS_LABEL[t.status] ?? t.status}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="body-s" style={{ fontWeight: 'var(--w-medium)' }}>{t.subject}</p>
                    <p className="caption">
                      Aberto em {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link href={`/tickets/${t.id}`} className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '4px 10px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    Abrir →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'marketing' && (
        <div className="lj-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            { label: 'E-mails promocionais', enabled: true, lastInteraction: 'Aberto há 8 dias' },
            { label: 'WhatsApp marketing', enabled: false, lastInteraction: 'Nunca enviado' },
            { label: 'SMS', enabled: false, lastInteraction: 'Opt-in pendente' },
            { label: 'Push notifications', enabled: false, lastInteraction: 'Sem permissão concedida' },
          ].map(c => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="body-s" style={{ fontWeight: 'var(--w-medium)' }}>{c.label}</p>
                <p className="caption">{c.lastInteraction}</p>
              </div>
              <span className={`lj-badge ${c.enabled ? 'lj-badge-success' : 'lj-badge-neutral'}`}>
                {c.enabled ? 'Opt-in' : 'Opt-out'}
              </span>
            </div>
          ))}
          <p className="caption" style={{ paddingTop: 'var(--space-2)' }}>
            Toggle de canais e auditoria LGPD virá em /clientes/[email]/preferencias.
          </p>
        </div>
      )}

      {tab === 'notes' && (
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <textarea
            placeholder="Anotações privadas sobre essa cliente — só sua equipe vê."
            className="lj-input"
            style={{ width: '100%', minHeight: 120, resize: 'vertical' }}
            defaultValue=""
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', alignItems: 'center' }}>
            <button type="button" className="lj-btn-primary" disabled style={{ fontSize: 'var(--text-caption)' }}>Salvar nota</button>
            <span className="caption">Persistência via API virá em iteração futura.</span>
          </div>
        </div>
      )}
    </div>
  );
}
