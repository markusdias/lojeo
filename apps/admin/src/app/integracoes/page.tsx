'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

const CATEGORY_TOOLTIPS: Record<string, string> = {
  Pagamentos: 'Mercado Pago é principal para BR (Pix + cartão + boleto). Stripe entra na Fase 1.2 internacional.',
  Fiscal: 'Bling NF-e é obrigatório para venda física. Sem ele, emissão é manual e pode atrasar pedidos.',
  Frete: 'Melhor Envio cobre Correios + Jadlog + transportadoras. Cotação automática reduz fricção checkout.',
};

interface Integration {
  category: string;
  name: string;
  status: 'connected' | 'partial' | 'disconnected' | 'optional';
  message: string;
  envVarsRequired: string[];
  envVarsPresent: string[];
}

interface Summary {
  connected: number;
  partial: number;
  disconnected: number;
  optional: number;
  total: number;
}

interface Response {
  integrations: Integration[];
  summary: Summary;
  checkedAt: string;
}

const STATUS_STYLE: Record<Integration['status'], { bg: string; text: string; label: string; emoji: string }> = {
  connected:    { bg: 'var(--success-soft)', text: 'var(--success)', label: 'Conectada', emoji: '✓' },
  partial:      { bg: 'var(--warning-soft)', text: 'var(--warning)', label: 'Parcial',   emoji: '⚠' },
  disconnected: { bg: 'var(--error-soft)',   text: 'var(--error)',   label: 'Desconectada', emoji: '✕' },
  optional:     { bg: 'var(--neutral-50)',   text: 'var(--neutral-500)', label: 'Opcional', emoji: '○' },
};

export default function IntegracoesPage() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/integrations/status')
      .then(async r => {
        const d = await r.json() as Response & { error?: string };
        if (!r.ok) {
          setError(d.error ?? `HTTP ${r.status}`);
        } else {
          setData(d);
        }
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-sm text-gray-500">Carregando...</div>;
  if (error || !data) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>;

  // Group by category
  const byCategory = data.integrations.reduce<Record<string, Integration[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category]!.push(i);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Integrações</h1>
        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
          Status de todas as conexões externas. Verifique antes de eventos críticos (Black Friday).
        </p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Conectadas</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--success)' }}>{data.summary.connected}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Parciais</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--warning)' }}>{data.summary.partial}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Desconectadas</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--error)' }}>{data.summary.disconnected}</p>
        </div>
        <div className="lj-card p-4">
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-secondary)' }}>Opcionais</p>
          <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--fg-muted)' }}>{data.summary.optional}</p>
        </div>
      </div>

      {/* Por categoria */}
      {Object.entries(byCategory).map(([category, items]) => (
        <section key={category} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-secondary)', display: 'inline-flex', alignItems: 'center' }}>
            {category}
            {CATEGORY_TOOLTIPS[category] && <InfoTooltip text={CATEGORY_TOOLTIPS[category]!} />}
          </h2>
          <div className="space-y-2">
            {items.map(i => {
              const sc = STATUS_STYLE[i.status];
              return (
                <div key={i.name} className="lj-card p-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{i.name}</p>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full" style={{ background: sc.bg, color: sc.text }}>
                        {sc.emoji} {sc.label}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{i.message}</p>
                    {i.envVarsRequired.length > 0 && (
                      <p className="text-xs mt-2 font-mono" style={{ color: 'var(--fg-muted)' }}>
                        Env: {i.envVarsRequired.map(v => i.envVarsPresent.includes(v) ? `✓${v}` : `✗${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
        Verificado em {new Date(data.checkedAt).toLocaleString('pt-BR')} · refletido em Sprint 13 status page pública (/status)
      </p>
    </div>
  );
}
