'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

interface Warranty {
  orderId: string;
  orderItemId: string;
  productName: string;
  customerEmail: string | null;
  startsAt: string;
  expiresAt: string | null;
  daysRemaining: number | null;
  status: 'active' | 'expiring_soon' | 'expired' | 'none';
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  active:        { bg: '#F0FDF4', text: '#166534', label: 'Ativa' },
  expiring_soon: { bg: '#FFF7ED', text: '#92400E', label: 'Expira em breve' },
  expired:       { bg: '#FEF2F2', text: '#991B1B', label: 'Expirada' },
  none:          { bg: '#F3F4F6', text: '#6B7280', label: 'Sem garantia' },
};

export default function GarantiasPage() {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState(''); // '' | '30' | '60' | '90'

  function load() {
    setLoading(true);
    const url = filter ? `/api/warranties?expiringIn=${filter}` : '/api/warranties';
    fetch(url).then(async r => {
      const d = await r.json() as { warranties?: Warranty[]; counts?: Record<string, number>; error?: string };
      if (!r.ok) {
        setError(d.error ?? `HTTP ${r.status}`);
      } else {
        setWarranties(d.warranties ?? []);
        setCounts(d.counts ?? {});
        setError('');
      }
    }).catch(e => setError(String(e))).finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Garantias</h1>
        <p className="text-sm text-gray-500 mt-1">Status das garantias de produtos vendidos.</p>
      </header>

      {/* Cards summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="lj-card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Ativas</p>
          <p className="text-2xl font-semibold text-green-700 mt-1">{counts.active ?? 0}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Expirando ≤30d</p>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{counts.expiring_soon ?? 0}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Expiradas</p>
          <p className="text-2xl font-semibold text-red-700 mt-1">{counts.expired ?? 0}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Sem garantia</p>
          <p className="text-2xl font-semibold text-gray-500 mt-1">{counts.none ?? 0}</p>
        </div>
      </div>

      {/* Filter expiring */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm text-gray-600 self-center">Vencendo nos próximos:</span>
        {[
          { v: '', label: 'Todos' },
          { v: '30', label: '30d' },
          { v: '60', label: '60d' },
          { v: '90', label: '90d' },
        ].map(o => (
          <button
            key={o.v}
            onClick={() => setFilter(o.v)}
            className={filter === o.v ? 'lj-btn-primary' : 'lj-btn-secondary'}
            style={{ padding: '6px 12px', fontSize: 14 }}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-500">Carregando...</p>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{error}</div>
      ) : warranties.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma garantia encontrada com este filtro.</p>
      ) : (
        <div className="lj-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Produto</th>
                <th className="text-left px-4 py-2">Cliente</th>
                <th className="text-left px-4 py-2">Início</th>
                <th className="text-left px-4 py-2">Expira</th>
                <th className="text-left px-4 py-2">Restam</th>
                <th className="text-left px-4 py-2">
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Status
                    <InfoTooltip text="Calculado a partir de paid_at + warrantyMonths × 30 dias. Expirando ≤30d = janela para email de renovação." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {warranties.map(w => {
                const sc = STATUS_COLOR[w.status]!;
                return (
                  <tr key={w.orderItemId} className="border-t border-gray-100">
                    <td className="px-4 py-2">{w.productName}</td>
                    <td className="px-4 py-2 text-xs">{w.customerEmail ?? '—'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {new Date(w.startsAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {w.expiresAt ? new Date(w.expiresAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {w.daysRemaining === null ? '—' :
                        w.daysRemaining < 0 ? `${Math.abs(w.daysRemaining)}d atrás` :
                        `${w.daysRemaining}d`}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ background: sc.bg, color: sc.text }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
