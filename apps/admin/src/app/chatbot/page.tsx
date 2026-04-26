'use client';

import { useEffect, useState } from 'react';

interface Stats {
  windowDays: number;
  total: number;
  resolved: number;
  escalated: number;
  resolutionRate: number;
  escalationRate: number;
  avgMsgs: number;
  totalTokensIn: number;
  totalTokensOut: number;
  topTopics: Array<{ topic: string; count: number }>;
}

const TOOL_LABEL: Record<string, string> = {
  search_products: 'Busca de produto',
  get_product_details: 'Detalhes de produto',
  check_stock: 'Verificar estoque',
  get_faq_answer: 'FAQ (frete/troca/garantia)',
  escalate_to_human: 'Escalação humana',
};

// Custo Haiku 4.5: $0.80/MTok input, $4/MTok output
function estimateCostUsd(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * 0.8 + (tokensOut / 1_000_000) * 4;
}

export default function ChatbotStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/chatbot/stats')
      .then(r => r.json())
      .then((d: Stats) => { setStats(d); setLoading(false); })
      .catch((e: unknown) => { setError(String(e)); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-sm text-gray-500">Carregando...</div>;
  if (error || !stats) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>;

  const costUsd = estimateCostUsd(stats.totalTokensIn, stats.totalTokensOut);

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Chatbot</h1>
        <p className="text-sm text-gray-500 mt-1">Telemetria das últimas {stats.windowDays} dias</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Conversas</p>
          <p className="text-2xl font-semibold mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Resolvidas</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">
            {stats.resolved} <span className="text-sm text-gray-400">({(stats.resolutionRate * 100).toFixed(0)}%)</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Escaladas</p>
          <p className="text-2xl font-semibold mt-1 text-amber-600">
            {stats.escalated} <span className="text-sm text-gray-400">({(stats.escalationRate * 100).toFixed(0)}%)</span>
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Custo IA</p>
          <p className="text-2xl font-semibold mt-1">${costUsd.toFixed(4)}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {stats.totalTokensIn.toLocaleString('pt-BR')} in / {stats.totalTokensOut.toLocaleString('pt-BR')} out
          </p>
        </div>
      </div>

      {/* Top tools */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Tópicos mais consultados</h2>
        {stats.topTopics.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma conversa ainda nos últimos {stats.windowDays} dias.</p>
        ) : (
          <div className="space-y-2">
            {stats.topTopics.map(t => {
              const max = stats.topTopics[0]!.count;
              const pct = (t.count / max) * 100;
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-sm w-48 shrink-0">{TOOL_LABEL[t.topic] ?? t.topic}</span>
                  <div className="flex-1 bg-gray-100 rounded h-6 relative">
                    <div className="bg-indigo-500 h-6 rounded" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{t.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="text-xs text-gray-400">
        Avg msgs/conversa: {stats.avgMsgs.toFixed(1)} · Modelo: Claude Haiku 4.5
      </div>
    </div>
  );
}
