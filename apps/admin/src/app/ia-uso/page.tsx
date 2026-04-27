'use client';

import { useEffect, useState } from 'react';
import { InfoTooltip } from '../../components/ui/info-tooltip';

interface UsageData {
  month: string;
  totalCalls: number;
  cachedCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCostBrl: number;
  brlPerUsd: number;
  byFeature: { feature: string; calls: number; cachedCalls: number; costUsd: number }[];
  byModel: { model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[];
  daily: { day: string; calls: number; costUsd: number }[];
  recent: {
    id: string;
    feature: string;
    model: string;
    cached: boolean;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    durationMs: number;
    success: boolean;
    error: string | null;
    createdAt: string;
  }[];
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

const ALERT_BADGE: Record<BudgetData['alert'], string> = {
  ok: 'lj-badge-success',
  warn: 'lj-badge-warning',
  over_forecast: 'lj-badge-warning',
  over: 'lj-badge-error',
};

const ALERT_BAR: Record<BudgetData['alert'], string> = {
  ok: 'var(--success)',
  warn: 'var(--warning)',
  over_forecast: 'var(--warning)',
  over: 'var(--error)',
};

const FEATURE_LABELS: Record<string, string> = {
  'product-copy': 'Descrição de produto',
  'seo-generation': 'SEO automático',
  'alt-text': 'Alt text de imagem',
  'analyst': 'IA Analyst',
  'chatbot': 'Chatbot storefront',
};

function modelLabel(model: string) {
  if (/haiku/i.test(model)) return 'Haiku';
  if (/sonnet/i.test(model)) return 'Sonnet';
  if (/opus/i.test(model)) return 'Opus';
  return model;
}

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
function fmtBrl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtInt(n: number) {
  return n.toLocaleString('pt-BR');
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function IaUsoPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [budget, setBudget] = useState<BudgetData | null>(null);

  useEffect(() => {
    fetch('/api/ia-usage').then(r => r.json()).then(setData);
    fetch('/api/ai-budget').then(r => r.json()).then(setBudget).catch(() => null);
  }, []);

  if (!data) return <main style={{ padding: 'var(--space-8)' }}><p style={{ color: 'var(--fg-muted)' }}>Carregando…</p></main>;

  const cacheRate = data.totalCalls > 0 ? Math.round((data.cachedCalls / data.totalCalls) * 100) : 0;
  const maxDailyCost = Math.max(...data.daily.map(d => d.costUsd), 0.0001);
  const totalTokens = data.totalInputTokens + data.totalOutputTokens;

  return (
    <main style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', marginBottom: 'var(--space-2)' }}>Uso de IA</h1>
          <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>Mês atual: {data.month} · cotação estimada R$ {data.brlPerUsd.toFixed(2)}/USD</p>
        </div>
        <a
          href="/settings#ia"
          className="lj-btn-secondary"
          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          Configurar limite
        </a>
      </header>

      <div className="lj-ai-banner">
        <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
        <div>
          <p className="lj-ai-eyebrow">IA · CONSUMO DE TOKENS</p>
          <p className="body-s" style={{ color: 'var(--fg)', marginTop: 4 }}>
            {data.totalCalls === 0
              ? 'Nenhuma chamada de IA neste mês. Recursos como IA Analyst, geração de copy e moderação UGC consomem tokens — defina limite em Configurações.'
              : `${data.totalCalls} chamadas neste mês · cache hit ${cacheRate}% (cada hit economiza ~100% do custo). ${cacheRate < 30 ? 'Cache rate baixo — considere aumentar TTL ou normalizar prompts.' : cacheRate >= 70 ? 'Cache excelente — uso eficiente.' : 'Cache moderado.'}`}
          </p>
        </div>
      </div>

      {/* Orçamento mensal */}
      {budget && budget.monthlyLimitUsd > 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', display: 'inline-flex', alignItems: 'center' }}>
              Orçamento mensal de IA
              <InfoTooltip text="Limite em USD. Acima do limite, IA bloqueia automaticamente até virar mês. 0 = ilimitado." />
            </h2>
            <span className={`lj-badge ${ALERT_BADGE[budget.alert]}`}>
              Dia {budget.daysIntoMonth}/{budget.daysInMonth}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)' }}>Limite</p>
              <p style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>${budget.monthlyLimitUsd.toFixed(2)}</p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)' }}>Gasto até hoje</p>
              <p style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>
                ${budget.monthToDateUsd.toFixed(2)}{' '}
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-muted)' }}>({budget.utilizationPercent.toFixed(0)}%)</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)' }}>Projeção fim do mês</p>
              <p style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)' }}>
                ${budget.forecastEndOfMonthUsd.toFixed(2)}{' '}
                <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-muted)' }}>({budget.forecastUtilizationPercent.toFixed(0)}%)</span>
              </p>
            </div>
          </div>
          <div style={{ marginTop: 'var(--space-3)', height: 8, background: 'var(--neutral-50)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, budget.utilizationPercent)}%`,
                height: '100%',
                background: ALERT_BAR[budget.alert],
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginTop: 'var(--space-2)' }}>{budget.alertMessage}</p>
        </section>
      )}
      {budget && budget.monthlyLimitUsd === 0 && (
        <div className="lj-card" style={{ padding: 'var(--space-4)', borderColor: 'var(--warning)', background: 'var(--warning-soft)', color: 'var(--warning)', fontSize: 'var(--text-body-s)' }}>
          Sem limite mensal de IA configurado. Defina em <a href="/settings#ia" style={{ textDecoration: 'underline', color: 'inherit' }}>Configurações</a> para ativar alertas.
        </div>
      )}

      {/* 4 Cards de resumo: chamadas / tokens / custo BRL / vs limite */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)', marginBottom: 'var(--space-1)' }}>Chamadas mês</p>
          <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)' }}>{fmtInt(data.totalCalls)}</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginTop: 'var(--space-1)' }}>cache hit {cacheRate}%</p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)', marginBottom: 'var(--space-1)', display: 'inline-flex', alignItems: 'center' }}>
            Tokens
            <InfoTooltip text="Total de tokens entrada + saída neste mês. Cache hits não contam tokens cobrados." />
          </p>
          <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)' }}>{fmtInt(totalTokens)}</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginTop: 'var(--space-1)' }}>in {fmtInt(data.totalInputTokens)} · out {fmtInt(data.totalOutputTokens)}</p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)', marginBottom: 'var(--space-1)', display: 'inline-flex', alignItems: 'center' }}>
            Custo BRL
            <InfoTooltip text={`Estimativa BRL = USD × ${data.brlPerUsd.toFixed(2)}. Trocar por cotação real assim que houver integração de exchange-rate.`} />
          </p>
          <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)' }}>{fmtBrl(data.totalCostBrl)}</p>
          <p style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginTop: 'var(--space-1)' }}>${fmtUsd(data.totalCostUsd)} USD</p>
        </div>
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          <p style={{ fontSize: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: 'var(--track-wide)', color: 'var(--fg-muted)', marginBottom: 'var(--space-1)' }}>vs Limite</p>
          {budget && budget.monthlyLimitUsd > 0 ? (
            <>
              <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)' }}>{budget.utilizationPercent.toFixed(0)}%</p>
              <p style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', marginTop: 'var(--space-1)' }}>
                ${budget.monthToDateUsd.toFixed(2)} de ${budget.monthlyLimitUsd.toFixed(2)}
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', color: 'var(--fg-muted)' }}>—</p>
              <a href="/settings#ia" style={{ fontSize: 'var(--text-caption)', color: 'var(--accent)', textDecoration: 'underline' }}>Definir limite</a>
            </>
          )}
        </div>
      </div>

      {/* Por feature */}
      {data.byFeature.length > 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Por feature</h2>
          <table style={{ width: '100%', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--fg-muted)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>Feature</th>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Chamadas</th>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Cache</th>
                <th style={{ padding: 'var(--space-2) 0 var(--space-2) 0', textAlign: 'right' }}>Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.byFeature.map(r => (
                <tr key={r.feature} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', fontWeight: 'var(--w-medium)' }}>{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>{r.calls}</td>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right', color: 'var(--success)' }}>
                    {r.calls > 0 ? `${Math.round((r.cachedCalls / r.calls) * 100)}%` : '—'}
                  </td>
                  <td style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>${fmtUsd(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Por modelo (Haiku vs Sonnet etc) */}
      {data.byModel.length > 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)', display: 'inline-flex', alignItems: 'center' }}>
            Por modelo
            <InfoTooltip text="Distribuição de chamadas e custo por modelo. Haiku ~6× mais barato que Sonnet — escolher Haiku quando qualidade for suficiente." />
          </h2>
          <table style={{ width: '100%', fontSize: 'var(--text-body-s)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--fg-muted)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>Modelo</th>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Chamadas</th>
                <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Tokens (in/out)</th>
                <th style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>Custo (USD)</th>
              </tr>
            </thead>
            <tbody>
              {data.byModel.map(r => (
                <tr key={r.model} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', fontWeight: 'var(--w-medium)' }}>
                    <span className="lj-badge lj-badge-info" style={{ marginRight: 'var(--space-2)' }}>{modelLabel(r.model)}</span>
                    <span style={{ color: 'var(--fg-muted)', fontSize: 'var(--text-caption)' }}>{r.model}</span>
                  </td>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>{r.calls}</td>
                  <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>{fmtInt(r.inputTokens)} / {fmtInt(r.outputTokens)}</td>
                  <td style={{ padding: 'var(--space-2) 0', textAlign: 'right' }}>${fmtUsd(r.costUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Gráfico diário */}
      {data.daily.length > 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Custo diário — últimos 30 dias</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 96 }}>
            {data.daily.map(d => {
              const height = Math.max(4, Math.round((d.costUsd / maxDailyCost) * 88));
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${d.day}: $${fmtUsd(d.costUsd)}`}>
                  <div style={{ height, width: '100%', background: 'var(--accent)', opacity: 0.7, borderTopLeftRadius: 'var(--radius-sm)', borderTopRightRadius: 'var(--radius-sm)' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-caption)', color: 'var(--fg-muted)', marginTop: 'var(--space-1)' }}>
            <span>{data.daily[0]?.day?.slice(5)}</span>
            <span>{data.daily[data.daily.length - 1]?.day?.slice(5)}</span>
          </div>
        </section>
      )}

      {/* Últimas 50 chamadas */}
      {data.recent.length > 0 && (
        <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>Últimas chamadas ({data.recent.length})</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 'var(--text-body-s)', minWidth: 720 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--fg-muted)', fontSize: 'var(--text-caption)', textTransform: 'uppercase' }}>
                  <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>Quando</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>Feature</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>Modelo</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Tokens</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right' }}>Custo</th>
                  <th style={{ padding: 'var(--space-2) 0', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', color: 'var(--fg-secondary)', whiteSpace: 'nowrap' }}>{fmtDateTime(r.createdAt)}</td>
                    <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                    <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0' }}>
                      <span className="lj-badge lj-badge-neutral">{modelLabel(r.model)}</span>
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtInt(r.inputTokens)}/{fmtInt(r.outputTokens)}
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3) var(--space-2) 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>${fmtUsd(r.costUsd)}</td>
                    <td style={{ padding: 'var(--space-2) 0', textAlign: 'center' }}>
                      {r.cached ? (
                        <span className="lj-badge lj-badge-info" title="Servido pelo cache (custo zero)">cache</span>
                      ) : r.success ? (
                        <span className="lj-badge lj-badge-success">ok</span>
                      ) : (
                        <span className="lj-badge lj-badge-error" title={r.error ?? ''}>erro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data.totalCalls === 0 && (
        <div className="lj-empty-state">
          <p className="lj-empty-state__title">Nenhuma chamada de IA registrada este mês.</p>
          <p className="lj-empty-state__body">Use &quot;Gerar com IA&quot; em qualquer produto para ver o uso aparecer aqui.</p>
        </div>
      )}
    </main>
  );
}
