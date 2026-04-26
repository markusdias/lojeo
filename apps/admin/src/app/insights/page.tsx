'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InfoTooltip } from '../../components/ui/info-tooltip';
import { MetricCard } from '../../components/ui/metric-card';

interface ChurnData {
  total: number;
  critical: number;
  high: number;
  customers: Array<{
    email: string;
    churnScore: number;
    churnRisk: string;
    daysSinceLastOrder: number;
    orderCount: number;
    suggestedAction: string;
  }>;
}

interface ForecastData {
  total: number;
  critical: number;
  warning: number;
  items: Array<{
    productId: string;
    productName: string;
    sku?: string | null;
    currentStock: number;
    dailyVelocity: number;
    daysUntilStockout: number;
    alert: string;
    alertMessage: string;
  }>;
}

const RISK_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEF2F2', text: '#991B1B', label: 'Crítico' },
  high:     { bg: '#FFF7ED', text: '#92400E', label: 'Alto' },
  medium:   { bg: '#FEFCE8', text: '#854D0E', label: 'Médio' },
  low:      { bg: '#F0FDF4', text: '#166534', label: 'Baixo' },
  active:   { bg: '#EFF6FF', text: '#1E40AF', label: 'Ativo' },
};

const ALERT_BADGE: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#FEF2F2', text: '#991B1B' },
  warning:  { bg: '#FFF7ED', text: '#92400E' },
  monitor:  { bg: '#EFF6FF', text: '#1E40AF' },
  stable:   { bg: '#F0FDF4', text: '#166534' },
  no_data:  { bg: '#F9FAFB', text: '#6B7280' },
};

interface FunnelStage {
  key: string;
  label: string;
  uniqueSessions: number;
  previousStageSessions: number;
  dropoff: number;
  conversionFromPrevious: number;
  conversionFromTop: number;
}

interface FunnelData {
  windowDays: number;
  stages: FunnelStage[];
  totalConversion: number;
}

export default function InsightsPage() {
  const [churn, setChurn] = useState<ChurnData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [tab, setTab] = useState<'churn' | 'estoque' | 'funil'>('churn');

  useEffect(() => {
    fetch('/api/customers/churn').then(r => r.json()).then(setChurn);
    fetch('/api/inventory/forecast').then(r => r.json()).then(setForecast);
    fetch('/api/funnel?days=30').then(r => r.json()).then(setFunnel);
  }, []);

  const tabStyle = (active: boolean) => ({
    padding: '8px 20px', fontSize: 14, fontWeight: 500, border: 'none',
    borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    background: 'none', cursor: 'pointer',
    color: active ? '#111827' : '#6B7280',
  });

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Insights</h1>
        <p className="body-s">Churn de clientes e previsão de ruptura de estoque</p>
      </header>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · ALERTAS DE RETENÇÃO</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            {(churn?.critical ?? 0) > 0
              ? `${churn?.critical} cliente(s) em estado crítico de churn (>180 dias sem comprar). Acionar campanha de retenção urgente.`
              : (churn?.high ?? 0) > 0
                ? `${churn?.high} cliente(s) em risco alto. Sugestão: cupom -10% via WhatsApp/email.`
                : (forecast?.critical ?? 0) > 0
                  ? `${forecast?.critical} produto(s) com ruptura prevista em ≤7 dias. Verifique reposição.`
                  : 'Nenhum alerta crítico — base de clientes saudável e estoque suficiente para o período.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <MetricCard label="Clientes críticos" value={String(churn?.critical ?? '—')} danger />
        <MetricCard label="Clientes risco alto" value={String(churn?.high ?? '—')} warning />
        <MetricCard label="Produtos críticos" value={String(forecast?.critical ?? '—')} danger />
        <MetricCard label="Produtos em alerta" value={String(forecast?.warning ?? '—')} warning />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: 24, display: 'flex', gap: 4 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <button style={tabStyle(tab === 'churn')} onClick={() => setTab('churn')}>Risco de Churn</button>
          <InfoTooltip text="Score 0-100 baseado em recência de compra e frequência. Critical = >180 dias sem comprar. Action = email retenção." />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <button style={tabStyle(tab === 'estoque')} onClick={() => setTab('estoque')}>Previsão de Estoque</button>
          <InfoTooltip text="Quanto tempo cada produto leva para zerar. Crítico = ≤7 dias. Reorder Point = velocity × 1.2." />
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <button style={tabStyle(tab === 'funil')} onClick={() => setTab('funil')}>Funil de Conversão</button>
          <InfoTooltip text="Taxa de cada etapa do checkout. Drop-off entre etapas = oportunidade de otimização." />
        </span>
      </div>

      {/* Funil tab */}
      {tab === 'funil' && (
        <div>
          {!funnel ? (
            <p style={{ fontSize: 13, color: '#6B7280' }}>Carregando funil...</p>
          ) : funnel.stages.every(s => s.uniqueSessions === 0) ? (
            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', padding: 16, borderRadius: 8, fontSize: 14, color: '#92400E' }}>
              Sem dados de comportamento ainda nos últimos {funnel.windowDays} dias. Eventos chegarão à medida que clientes navegarem.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                Janela: {funnel.windowDays} dias · Conversão geral: <strong>{(funnel.totalConversion * 100).toFixed(2)}%</strong>
              </p>
              {funnel.stages.map((stage, i) => {
                const top = funnel.stages[0]?.uniqueSessions ?? 1;
                const widthPct = top > 0 ? (stage.uniqueSessions / top) * 100 : 0;
                const conversionPct = (stage.conversionFromPrevious * 100).toFixed(1);
                const fromTopPct = (stage.conversionFromTop * 100).toFixed(1);
                return (
                  <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 180, fontSize: 14 }}>
                      <p style={{ fontWeight: 500 }}>{stage.label}</p>
                      <p style={{ fontSize: 11, color: '#6B7280' }}>{stage.uniqueSessions} sessões</p>
                    </div>
                    <div style={{ flex: 1, height: 32, background: '#F3F4F6', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                      <div style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: i === 0 ? '#3B82F6' : i === funnel.stages.length - 1 ? '#10B981' : '#6366F1',
                        transition: 'width 200ms',
                      }} />
                      <span style={{ position: 'absolute', right: 8, top: 6, fontSize: 12, fontWeight: 600, color: '#1F2937' }}>
                        {fromTopPct}%
                      </span>
                    </div>
                    {i > 0 && (
                      <div style={{ width: 100, fontSize: 12, color: stage.conversionFromPrevious < 0.3 ? '#991B1B' : '#6B7280' }}>
                        ↓ {conversionPct}% <br />
                        <span style={{ fontSize: 10 }}>−{stage.dropoff} sessões</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Churn tab */}
      {tab === 'churn' && (
        <section>
          {!churn ? (
            <p style={{ color: '#6B7280' }}>Carregando…</p>
          ) : churn.customers.length === 0 ? (
            <p style={{ color: '#6B7280' }}>Nenhum dado de pedido disponível.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Cliente</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Risco</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Score</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Dias s/ compra</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Pedidos</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Ação sugerida</th>
                </tr>
              </thead>
              <tbody>
                {churn.customers.filter(c => c.churnRisk !== 'active').slice(0, 50).map(c => {
                  const badge = RISK_BADGE[c.churnRisk] ?? RISK_BADGE['medium']!;
                  return (
                    <tr key={c.email} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <Link href={`/clientes/${encodeURIComponent(c.email)}`} style={{ color: '#2563EB', textDecoration: 'none' }}>
                          {c.email}
                        </Link>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: badge.bg, color: badge.text, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.churnScore}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7280' }}>{c.daysSinceLastOrder}d</td>
                      <td style={{ padding: '10px 12px' }}>{c.orderCount}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7280', fontSize: 13 }}>{c.suggestedAction}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Estoque tab */}
      {tab === 'estoque' && (
        <section>
          {!forecast ? (
            <p style={{ color: '#6B7280' }}>Carregando…</p>
          ) : forecast.items.length === 0 ? (
            <p style={{ color: '#6B7280' }}>Nenhum produto ativo encontrado.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Produto</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>SKU</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Estoque</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Velocidade</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Dias até ruptura</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {forecast.items.filter(f => f.alert !== 'stable' && f.alert !== 'no_data').slice(0, 50).map(f => {
                  const badge = ALERT_BADGE[f.alert] ?? ALERT_BADGE['stable']!;
                  const days = f.daysUntilStockout === Infinity ? '∞' : `${f.daysUntilStockout}d`;
                  return (
                    <tr key={f.productId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{f.productName}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7280' }}>{f.sku ?? '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{f.currentStock}</td>
                      <td style={{ padding: '10px 12px', color: '#6B7280' }}>{f.dailyVelocity}/dia</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{days}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: badge.bg, color: badge.text, fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                          {f.alertMessage}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
