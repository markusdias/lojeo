'use client';

import { useEffect, useState } from 'react';

type ReportType = 'revenue_summary' | 'conversion_funnel' | 'inventory_low';

interface ReportRow {
  id: string;
  name: string;
  reportType: ReportType;
  cronExpression: string;
  destinations: { emails: string[]; channels?: string[] };
  filters: Record<string, unknown>;
  active: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface ListResp {
  reports: ReportRow[];
  resendConfigured: boolean;
}

const TYPE_LABEL: Record<ReportType, string> = {
  revenue_summary: 'Resumo de receita',
  conversion_funnel: 'Funil de conversão',
  inventory_low: 'Estoque baixo',
};

const CRON_PRESETS: Array<{ label: string; cron: string }> = [
  { label: 'Diário 9h', cron: '0 9 * * *' },
  { label: 'Diário 18h', cron: '0 18 * * *' },
  { label: 'Semanal seg 9h', cron: '0 9 * * 1' },
  { label: 'Mensal dia 1 9h', cron: '0 9 1 * *' },
  { label: 'A cada 6h', cron: '0 */6 * * *' },
];

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md, 8px)',
  padding: 16,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid var(--border-strong, #D1D5DB)',
  borderRadius: 'var(--radius-sm, 6px)',
  background: 'var(--bg-elevated, #fff)',
  color: 'var(--fg, #111)',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--fg-secondary, #6B7280)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginBottom: 4,
  display: 'block',
};

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

export default function RelatoriosPage() {
  const [data, setData] = useState<ListResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [name, setName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('revenue_summary');
  const [cron, setCron] = useState('0 9 * * *');
  const [emails, setEmails] = useState('');
  const [active, setActive] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch('/api/relatorios');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as ListResp;
      setData(j);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const emailList = emails.split(/\n|,/).map(s => s.trim()).filter(Boolean);
      const r = await fetch('/api/relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          reportType,
          cronExpression: cron.trim(),
          destinations: { emails: emailList },
          filters: reportType === 'inventory_low' ? { stockThreshold: 5 } : {},
          active,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || j.fields?.map((f: { message: string }) => f.message).join(', ') || `HTTP ${r.status}`);
      }
      setName('');
      setEmails('');
      setActive(true);
      void refresh();
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(row: ReportRow) {
    await fetch(`/api/relatorios/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !row.active }),
    });
    void refresh();
  }

  async function remove(row: ReportRow) {
    if (!confirm(`Remover relatório "${row.name}"?`)) return;
    await fetch(`/api/relatorios/${row.id}`, { method: 'DELETE' });
    void refresh();
  }

  async function runNow(row: ReportRow) {
    const r = await fetch(`/api/relatorios/${row.id}/run`, { method: 'POST' });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(`Erro ao executar: ${j.error || r.status}`);
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${row.reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    void refresh();
  }

  return (
    <main style={{ padding: 'var(--space-8, 32px) var(--space-8, 32px) var(--space-12, 48px)', maxWidth: 'var(--container-max, 1200px)', margin: '0 auto' }} className="space-y-6">
      <header>
        <h1 style={{ fontSize: 'var(--text-h1, 28px)', fontWeight: 600, marginBottom: 6 }}>
          Relatórios programados
        </h1>
        <p className="body-s" style={{ color: 'var(--fg-secondary, #6B7280)' }}>
          Agenda envio automático de relatórios por email (cron) ou execute sob demanda para download CSV.
        </p>
      </header>

      {data && !data.resendConfigured && (
        <div
          role="status"
          style={{
            background: '#FEF3C7',
            border: '1px solid #FCD34D',
            color: '#92400E',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <strong>Aviso:</strong> envio automático requer Resend API key configurada. Sem chave, relatórios são gerados mas não enviados — você ainda pode usar &quot;Executar agora&quot; para baixar CSV.
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: 12, borderRadius: 8, fontSize: 13 }}>
          {errorMsg}
        </div>
      )}

      {/* Form cadastro */}
      <section style={cardStyle}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Novo relatório</h2>
        <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle} htmlFor="r-name">Nome</label>
            <input
              id="r-name"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Receita semanal"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle} htmlFor="r-type">Tipo</label>
            <select
              id="r-type"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              style={inputStyle}
            >
              <option value="revenue_summary">Resumo de receita</option>
              <option value="conversion_funnel">Funil de conversão</option>
              <option value="inventory_low">Estoque baixo</option>
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="r-cron">Cron (5 campos)</label>
            <input
              id="r-cron"
              required
              maxLength={40}
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * *"
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.cron}
                  type="button"
                  onClick={() => setCron(p.cron)}
                  className="lj-btn-secondary"
                  style={{ fontSize: 11, padding: '4px 8px' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle} htmlFor="r-emails">Destinos (emails — 1 por linha)</label>
            <textarea
              id="r-emails"
              rows={3}
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="lojista@dominio.com&#10;ops@dominio.com"
              style={{ ...inputStyle, fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="r-active"
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <label htmlFor="r-active" style={{ fontSize: 14 }}>Ativo</label>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              className="lj-btn-primary"
              style={{ width: '100%', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Salvando…' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </section>

      {/* Tabela */}
      <section style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#6B7280', fontSize: 14 }}>Carregando…</div>
        ) : !data || data.reports.length === 0 ? (
          <div style={{ padding: 24, color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
            Nenhum relatório programado ainda. Cadastre um acima.
          </div>
        ) : (
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border, #E5E7EB)', textAlign: 'left', background: 'var(--neutral-50, #F9FAFB)' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Nome</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Tipo</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Cron</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Destinos</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Última execução</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Ativo</th>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.reports.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border, #F3F4F6)' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{row.name}</td>
                  <td style={{ padding: '10px 12px' }}>{TYPE_LABEL[row.reportType] ?? row.reportType}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{row.cronExpression}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {row.destinations.emails.length === 0 ? (
                        <span style={{ color: '#9CA3AF', fontSize: 12 }}>—</span>
                      ) : (
                        row.destinations.emails.map((e) => (
                          <span
                            key={e}
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              background: 'var(--neutral-100, #F3F4F6)',
                              borderRadius: 12,
                              color: 'var(--fg-secondary, #4B5563)',
                            }}
                          >
                            {e}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6B7280' }}>{fmtDate(row.lastRunAt)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      onClick={() => toggleActive(row)}
                      style={{
                        background: row.active ? 'var(--accent, #16A34A)' : 'var(--neutral-200, #D1D5DB)',
                        color: 'var(--text-on-dark, #fff)',
                        border: 'none',
                        borderRadius: 12,
                        padding: '4px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      {row.active ? 'Ativo' : 'Pausado'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => runNow(row)}
                        className="lj-btn-secondary"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                      >
                        Executar agora
                      </button>
                      <button
                        onClick={() => remove(row)}
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          background: 'transparent',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <p style={{ fontSize: 12, color: '#9CA3AF' }}>
        V1 stub: cron é apenas string armazenada — o scheduler real (Trigger.dev / Resend) entra na próxima sprint.
        Use &quot;Executar agora&quot; para gerar o CSV imediatamente.
      </p>
    </main>
  );
}
