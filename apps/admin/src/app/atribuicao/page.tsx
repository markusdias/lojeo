'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

type AttributionModel = 'last_click' | 'first_click' | 'linear';

interface AttributionRow {
  source: string;
  medium: string;
  campaign: string;
  orders: number;
  revenue: number;
  aov: number;
  conversionRate: number;
}

interface AttributionResponse {
  windowDays: number;
  model: AttributionModel;
  note: string | null;
  data: AttributionRow[];
  error?: string;
}

const MODEL_LABELS: Record<AttributionModel, string> = {
  last_click: 'Last-click',
  first_click: 'First-click',
  linear: 'Linear',
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
}

export default function AtribuicaoPage() {
  const [model, setModel] = useState<AttributionModel>('last_click');
  const [days, setDays] = useState<number>(30);
  const [resp, setResp] = useState<AttributionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attribution?days=${days}&model=${model}`)
      .then((r) => r.json())
      .then((d: AttributionResponse) => {
        setResp(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [days, model]);

  const showPlaceholderBanner = model !== 'last_click';

  const selectStyle = {
    padding: '8px 12px',
    fontSize: 14,
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    color: 'var(--fg)',
    cursor: 'pointer',
  } as const;

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Atribuição multi-touch</h1>
        <p className="body-s">
          Receita e conversão por origem de tráfego (UTM source / medium / campaign)
        </p>
      </header>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · MODELO DE ATRIBUIÇÃO</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            Last-click subestima topo de funil; first-click ignora retargeting. Linear distribui crédito igualmente entre todos os toques —
            recomendado para análise de aquisição. Compare 2 modelos para identificar canais subvalorizados.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="lj-card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center' }}>
            Modelo de atribuição
            <InfoTooltip text="Last-click = atribui 100% ao último UTM antes da compra. First-click = primeira interação. Linear = divide igualmente entre toques." />
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as AttributionModel)}
            style={selectStyle}
          >
            <option value="last_click">{MODEL_LABELS.last_click}</option>
            <option value="first_click">{MODEL_LABELS.first_click}</option>
            <option value="linear">{MODEL_LABELS.linear}</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Janela
          </label>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={selectStyle}
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>
        <button
          className="lj-btn-secondary"
          onClick={() => {
            setLoading(true);
            fetch(`/api/attribution?days=${days}&model=${model}`)
              .then((r) => r.json())
              .then((d: AttributionResponse) => {
                setResp(d);
                setLoading(false);
              })
              .catch(() => setLoading(false));
          }}
          style={{ marginTop: 18 }}
        >
          Atualizar
        </button>
      </div>

      {/* Placeholder banner para first_click / linear */}
      {showPlaceholderBanner && (
        <div
          style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <strong>Aviso v1:</strong> First-click e Linear v1 = last-click. Roadmap futuro: análise completa de jornada com cross-reference em behavior_events.
          {resp?.note && <div style={{ marginTop: 4, opacity: 0.9 }}>{resp.note}</div>}
        </div>
      )}

      {/* Tabela */}
      <div className="lj-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Carregando…</div>
        ) : resp?.error ? (
          <div style={{ padding: 24, color: '#991B1B', fontSize: 14 }}>Erro: {resp.error}</div>
        ) : !resp || resp.data.length === 0 ? (
          <div style={{ padding: 24, color: '#6B7280', fontSize: 14 }}>
            Sem pedidos pagos com UTM nos últimos {days} dias.
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left', background: '#F9FAFB' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Source</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Medium</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Campaign</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Orders</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Revenue (R$)</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>AOV</th>
                <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Conv%
                    <InfoTooltip text="Pedidos / sessões únicas com mesmo UTM. AOV = average order value." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resp.data.map((row, idx) => (
                <tr key={`${row.source}-${row.medium}-${row.campaign}-${idx}`} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row.source}</td>
                  <td style={{ padding: '10px 12px', color: '#374151' }}>{row.medium}</td>
                  <td style={{ padding: '10px 12px', color: '#6B7280' }}>{row.campaign}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{row.orders}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatBRL(row.revenue)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>{formatBRL(row.aov)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6B7280' }}>
                    {(row.conversionRate * 100).toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
        Apenas pedidos com status pago, em preparação, enviado ou entregue. Conversão = orders / sessões únicas (anonymousId distinto) com mesmo UTM em behavior_events.
      </p>
    </main>
  );
}
