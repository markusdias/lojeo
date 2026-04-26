'use client';

import { useEffect, useState } from 'react';

interface UsageData {
  month: string;
  totalCalls: number;
  cachedCalls: number;
  totalCostUsd: number;
  byFeature: { feature: string; calls: number; cachedCalls: number; costUsd: number }[];
  daily: { day: string; calls: number; costUsd: number }[];
}

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

  useEffect(() => {
    fetch('/api/ia-usage').then(r => r.json()).then(setData);
  }, []);

  if (!data) return <main className="p-8"><p className="text-neutral-500">Carregando…</p></main>;

  const cacheRate = data.totalCalls > 0 ? Math.round((data.cachedCalls / data.totalCalls) * 100) : 0;
  const maxDailyCost = Math.max(...data.daily.map(d => d.costUsd), 0.0001);

  return (
    <main className="p-8 max-w-4xl space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Uso de IA</h1>
        <p className="text-sm text-neutral-500 mt-1">Mês atual: {data.month}</p>
      </header>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Chamadas este mês', value: data.totalCalls.toString() },
          { label: 'Cache hit rate', value: `${cacheRate}%` },
          { label: 'Custo estimado (USD)', value: `$${fmt(data.totalCostUsd)}` },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">{c.label}</p>
            <p className="text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
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
