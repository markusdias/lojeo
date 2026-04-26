'use client';

import { useState, useEffect } from 'react';

interface StockRow {
  id: string;
  variantId: string;
  locationId: string;
  qty: number;
  reserved: number;
  lowStockThreshold: number;
  sku: string | null;
  productName?: string;
}

export default function InventoryPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inventory')
      .then(r => r.json())
      .then((d: { stock: StockRow[] }) => { setStock(d.stock ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function alertLevel(row: StockRow): 'critical' | 'low' | 'ok' {
    const available = row.qty - row.reserved;
    if (available <= 0) return 'critical';
    if (row.lowStockThreshold > 0 && available <= row.lowStockThreshold) return 'low';
    return 'ok';
  }

  const ALERT_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: '#FEF2F2', text: '#991B1B', label: 'Esgotado' },
    low: { bg: '#FFF7ED', text: '#92400E', label: 'Baixo' },
    ok: { bg: '#F0FDF4', text: '#166534', label: 'OK' },
  };

  const criticalCount = stock.filter(r => alertLevel(r) === 'critical').length;
  const lowCount = stock.filter(r => alertLevel(r) === 'low').length;

  return (
    <div className="p-8 max-w-5xl">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600 }}>Estoque</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>Visão consolidada por variante</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {criticalCount > 0 && (
            <span style={{ background: '#FEF2F2', color: '#991B1B', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>
              {criticalCount} esgotado{criticalCount !== 1 ? 's' : ''}
            </span>
          )}
          {lowCount > 0 && (
            <span style={{ background: '#FFF7ED', color: '#92400E', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 99 }}>
              {lowCount} baixo{lowCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading && <p style={{ color: '#6B7280', fontSize: 14 }}>Carregando…</p>}

      {!loading && stock.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9CA3AF' }}>
          <p style={{ fontSize: 16 }}>Nenhum registro de estoque.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Use a API POST /api/inventory para registrar entradas de estoque.</p>
        </div>
      )}

      {!loading && stock.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>SKU</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Qtd total</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Reservado</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Disponível</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Alerta mín.</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {stock.map(row => {
              const available = row.qty - row.reserved;
              const level = alertLevel(row);
              const style = ALERT_STYLE[level]!;
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 13 }}>{row.sku ?? '—'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row.qty}</td>
                  <td style={{ padding: '10px 12px', color: '#6B7280' }}>{row.reserved}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{available}</td>
                  <td style={{ padding: '10px 12px', color: '#6B7280' }}>{row.lowStockThreshold}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: style.bg, color: style.text, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
