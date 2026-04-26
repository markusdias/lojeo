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
      .then(async r => {
        const d = await r.json() as Partial<Stats> & { error?: string };
        if (!r.ok || d.error) {
          setError(d.error ?? `HTTP ${r.status}`);
        } else if (typeof d.total === 'number') {
          setStats(d as Stats);
        } else {
          setError('Resposta inesperada do servidor');
        }
      })
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 body-s">Carregando...</div>;
  if (error || !stats) return (
    <div className="p-8 max-w-3xl space-y-3">
      <h1 className="text-xl font-semibold">Chatbot</h1>
      <div
        className="rounded p-4 body-s"
        style={{
          background: 'color-mix(in srgb, var(--warning) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
          color: 'var(--warning)',
        }}
      >
        <p className="font-medium">Sem dados de telemetria ainda.</p>
        {error && <p className="caption mt-1">Detalhe: {error}</p>}
        <p className="caption mt-2">
          Os dados aparecerão aqui assim que o widget de chat receber as primeiras conversas em produção.
        </p>
      </div>
    </div>
  );

  const costUsd = estimateCostUsd(stats.totalTokensIn, stats.totalTokensOut);

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Chatbot</h1>
        <p className="body-s mt-1">Telemetria das últimas {stats.windowDays} dias</p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="lj-card p-4">
          <p className="eyebrow">Conversas</p>
          <p className="text-2xl font-semibold numeric mt-1">{stats.total}</p>
        </div>
        <div className="lj-card p-4">
          <p className="eyebrow">Resolvidas</p>
          <p className="text-2xl font-semibold numeric mt-1" style={{ color: 'var(--success)' }}>
            {stats.resolved} <span className="body-s">({(stats.resolutionRate * 100).toFixed(0)}%)</span>
          </p>
        </div>
        <div className="lj-card p-4">
          <p className="eyebrow">Escaladas</p>
          <p className="text-2xl font-semibold numeric mt-1" style={{ color: 'var(--warning)' }}>
            {stats.escalated} <span className="body-s">({(stats.escalationRate * 100).toFixed(0)}%)</span>
          </p>
        </div>
        <div className="lj-card p-4">
          <p className="eyebrow">Custo IA</p>
          <p className="text-2xl font-semibold numeric mt-1">${costUsd.toFixed(4)}</p>
          <p className="caption mt-0.5">
            {stats.totalTokensIn.toLocaleString('pt-BR')} in / {stats.totalTokensOut.toLocaleString('pt-BR')} out
          </p>
        </div>
      </div>

      {/* Top tools */}
      <div className="lj-card p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--fg)' }}>Tópicos mais consultados</h2>
        {stats.topTopics.length === 0 ? (
          <p className="body-s">Nenhuma conversa ainda nos últimos {stats.windowDays} dias.</p>
        ) : (
          <div className="space-y-2">
            {stats.topTopics.map(t => {
              const max = stats.topTopics[0]!.count;
              const pct = (t.count / max) * 100;
              return (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-sm w-48 shrink-0">{TOOL_LABEL[t.topic] ?? t.topic}</span>
                  <div className="flex-1 rounded h-6 relative" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-6 rounded" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <span className="text-sm font-medium numeric w-12 text-right">{t.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="caption">
        Avg msgs/conversa: {stats.avgMsgs.toFixed(1)} · Modelo: Claude Haiku 4.5
      </div>
    </div>
  );
}
