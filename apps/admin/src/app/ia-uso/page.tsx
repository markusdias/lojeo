'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

interface UsageData {
  month: string;
  totalCalls: number;
  cachedCalls: number;
  totalCostUsd: number;
  byFeature: { feature: string; calls: number; cachedCalls: number; costUsd: number }[];
  daily: { day: string; calls: number; costUsd: number }[];
}

interface BudgetData {
  monthlyLimitUsd: number;
  monthToDateUsd: number;
  forecastEndOfMonthUsd: number;
  utilizationPercent: number;
  forecastUtilizationPercent: number;
  daysIntoMonth: number;
  daysInMonth: number;
  alert: 'ok' | 'warn' | 'over_forecast' | 'over';
  alertMessage: string;
}

const ALERT_STYLES: Record<BudgetData['alert'], { bg: string; border: string; text: string }> = {
  ok:            { bg: '#F0FDF4', border: '#86EFAC', text: '#166534' },
  warn:          { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
  over_forecast: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
  over:          { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' },
};

const FEATURE_LABELS: Record<string, string> = {
  'product-copy': 'Descrição de produto',
  'seo-generation': 'SEO automático',
  'alt-text': 'Alt text de imagem',
  'analyst': 'IA Analyst',
  'chatbot': 'Chatbot storefront',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function IaUsoPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);

  useEffect(() => {
    fetch('/api/ia-usage').then(r => r.json()).then(setData);
    fetch('/api/ai-budget').then(r => r.json()).then(setBudget).catch(() => null);
  }, []);

  if (!data) return <main className="p-8"><p className="text-neutral-500">Carregando…</p></main>;

  const cacheRate = data.totalCalls > 0 ? Math.round((data.cachedCalls / data.totalCalls) * 100) : 0;
  const maxDailyCost = Math.max(...data.daily.map(d => d.costUsd), 0.0001);

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Uso de IA</h1>
        <p className="text-sm text-neutral-500 mt-1">Mês atual: {data.month}</p>
      </header>

      {/* Orçamento mensal */}
      {budget && budget.monthlyLimitUsd > 0 && (
        <section
          style={{
            background: ALERT_STYLES[budget.alert].bg,
            border: `1px solid ${ALERT_STYLES[budget.alert].border}`,
            color: ALERT_STYLES[budget.alert].text,
          }}
          className="rounded-lg p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm" style={{ display: 'inline-flex', alignItems: 'center' }}>
              Orçamento mensal de IA
              <InfoTooltip text="Limite em USD. Acima do limite, IA bloqueia automaticamente até virar mês. 0 = ilimitado." />
            </h2>
            <span className="text-xs">
              Dia {budget.daysIntoMonth} de {budget.daysInMonth}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Limite</p>
              <p className="text-lg font-semibold">${budget.monthlyLimitUsd.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Gasto até hoje</p>
              <p className="text-lg font-semibold">
                ${budget.monthToDateUsd.toFixed(2)} <span className="text-xs opacity-70">({budget.utilizationPercent.toFixed(0)}%)</span>
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide opacity-70">Projeção fim do mês</p>
              <p className="text-lg font-semibold">
                ${budget.forecastEndOfMonthUsd.toFixed(2)} <span className="text-xs opacity-70">({budget.forecastUtilizationPercent.toFixed(0)}%)</span>
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-white/40 rounded overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, budget.utilizationPercent)}%`,
                background: budget.alert === 'over' ? '#DC2626' : budget.alert === 'over_forecast' ? '#D97706' : budget.alert === 'warn' ? '#EA580C' : '#16A34A',
              }}
            />
          </div>
          <p className="text-xs mt-2">{budget.alertMessage}</p>
        </section>
      )}
      {budget && budget.monthlyLimitUsd === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
          Sem limite mensal de IA configurado. Defina em <a href="/settings" className="underline">Configurações</a> para ativar alertas.
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Chamadas este mês</p>
          <p className="text-2xl font-semibold">{data.totalCalls.toString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Cache hit rate
            <InfoTooltip text="% de chamadas servidas pelo cache (gratuitas). Acima de 60% indica boa otimização. Cache TTL é 30 dias para descrições, 90 para SEO." />
          </p>
          <p className="text-2xl font-semibold">{`${cacheRate}%`}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Custo estimado (USD)
            <InfoTooltip text="Soma de input × output tokens × preço modelo. Haiku 4.5 = $0.80/MTok in + $4/MTok out. Sonnet 3.5 ~6× mais caro." />
          </p>
          <p className="text-2xl font-semibold">{`$${fmt(data.totalCostUsd)}`}</p>
        </div>
      </div>

      {/* Por feature */}
      {data.byFeature.length > 0 && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-base mb-4">Por feature</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 text-xs uppercase">
                <th className="pb-2 pr-4">Feature</th>
                <th className="pb-2 pr-4 text-right">Chamadas</th>
                <th className="pb-2 pr-4 text-right">Cache</th>
                <th className="pb-2 text-right">Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.byFeature.map(r => (
                <tr key={r.feature} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                  <td className="py-2 pr-4 text-right">{r.calls}</td>
                  <td className="py-2 pr-4 text-right text-green-600">
                    {r.calls > 0 ? `${Math.round((r.cachedCalls / r.calls) * 100)}%` : '—'}
                  </td>
                  <td className="py-2 text-right">${fmt(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Gráfico diário (barras ASCII/inline) */}
      {data.daily.length > 0 && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-base mb-4">Custo diário — últimos 30 dias</h2>
          <div className="flex items-end gap-1 h-24">
            {data.daily.map(d => {
              const height = Math.max(4, Math.round((d.costUsd / maxDailyCost) * 96));
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.day}: $${fmt(d.costUsd)}`}>
                  <div
                    style={{ height }}
                    className="w-full bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-neutral-400 mt-1">
            <span>{data.daily[0]?.day?.slice(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.day?.slice(5)}</span>
          </div>
        </section>
      )}

      {data.totalCalls === 0 && (
        <div className="bg-neutral-50 rounded-lg p-8 text-center text-neutral-500">
          <p className="text-base">Nenhuma chamada de IA registrada este mês.</p>
          <p className="text-sm mt-2">Use "Gerar com IA" em qualquer produto para ver o uso aparecer aqui.</p>
        </div>
      )}
    </main>
  );
}
