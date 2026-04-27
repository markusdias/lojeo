'use client';

import { useState } from 'react';

interface AffiliateRow {
  id: string;
  affiliateName: string;
  affiliateEmail: string | null;
  code: string;
  commissionBps: number;
  clicks: number;
  conversions: number;
  payoutCents: number;
  pendingCents: number;
  active: boolean;
}

interface Props {
  initial: AffiliateRow[];
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AffiliatesPanel({ initial }: Props) {
  const [rows, setRows] = useState<AffiliateRow[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    affiliateName: '',
    affiliateEmail: '',
    code: '',
    commissionBps: 1000,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          affiliateName: form.affiliateName,
          affiliateEmail: form.affiliateEmail || null,
          code: form.code.toUpperCase(),
          commissionBps: form.commissionBps,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; affiliate?: AffiliateRow; error?: string };
      if (!res.ok || !data.affiliate) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setRows((prev) => [data.affiliate!, ...prev]);
      setForm({ affiliateName: '', affiliateEmail: '', code: '', commissionBps: 1000 });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erro');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(row: AffiliateRow) {
    const res = await fetch(`/api/affiliates/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ active: !row.active }),
    });
    if (res.ok) {
      const data = (await res.json()) as { affiliate: AffiliateRow };
      setRows((prev) => prev.map((r) => (r.id === row.id ? data.affiliate : r)));
    }
  }

  async function handlePayout(row: AffiliateRow) {
    if (row.pendingCents <= 0) return;
    if (!confirm(`Marcar ${fmtBRL(row.pendingCents)} como pago para ${row.affiliateName}?`)) return;
    const res = await fetch(`/api/affiliates/${row.id}/payout`, { method: 'POST' });
    if (res.ok) {
      const data = (await res.json()) as { affiliate: AffiliateRow };
      setRows((prev) => prev.map((r) => (r.id === row.id ? data.affiliate : r)));
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            padding: '8px 16px',
            background: showForm ? 'var(--surface)' : 'var(--text-primary)',
            color: showForm ? 'var(--text-primary)' : 'var(--text-on-dark, #fff)',
            border: '1px solid var(--text-primary)',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancelar' : '+ Novo afiliado'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          style={{
            padding: 16,
            background: 'var(--surface-sunken, #FAF6EE)',
            borderRadius: 8,
            marginBottom: 24,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <input
            placeholder="Nome do afiliado"
            value={form.affiliateName}
            onChange={(e) => setForm({ ...form, affiliateName: e.target.value })}
            required
            minLength={2}
            style={{ padding: 8, borderRadius: 4, border: '1px solid var(--divider)' }}
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={form.affiliateEmail}
            onChange={(e) => setForm({ ...form, affiliateEmail: e.target.value })}
            style={{ padding: 8, borderRadius: 4, border: '1px solid var(--divider)' }}
          />
          <input
            placeholder="Código (ex: MARIA10)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
            required
            minLength={2}
            maxLength={32}
            style={{ padding: 8, borderRadius: 4, border: '1px solid var(--divider)', fontFamily: 'monospace' }}
          />
          <input
            type="number"
            placeholder="Comissão (bps — 1000=10%)"
            value={form.commissionBps}
            onChange={(e) => setForm({ ...form, commissionBps: parseInt(e.target.value) || 0 })}
            min={0}
            max={10000}
            style={{ padding: 8, borderRadius: 4, border: '1px solid var(--divider)' }}
          />
          {error && (
            <p style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--error, #B91C1C)' }}>{error}</p>
          )}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 16px',
                background: 'var(--text-primary)',
                color: 'var(--text-on-dark, #fff)',
                border: 'none',
                borderRadius: 6,
                cursor: submitting ? 'wait' : 'pointer',
              }}
            >
              {submitting ? 'Salvando...' : 'Criar afiliado'}
            </button>
          </div>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500 }}>Afiliado</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: 500 }}>Código</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>%</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>Cliques</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>Conv.</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>Pago</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontWeight: 500 }}>Pendente</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontWeight: 500 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                Nenhum afiliado cadastrado ainda. Clique em &quot;+ Novo afiliado&quot; para começar.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--divider)', opacity: r.active ? 1 : 0.5 }}>
              <td style={{ padding: '10px 8px' }}>
                <div style={{ fontWeight: 500 }}>{r.affiliateName}</div>
                {r.affiliateEmail && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.affiliateEmail}</div>
                )}
              </td>
              <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>{r.code}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{(r.commissionBps / 100).toFixed(1)}%</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{r.clicks}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{r.conversions}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmtBRL(r.payoutCents)}</td>
              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: r.pendingCents > 0 ? 500 : 400, color: r.pendingCents > 0 ? 'var(--accent)' : 'inherit' }}>
                {fmtBRL(r.pendingCents)}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  {r.pendingCents > 0 && (
                    <button
                      type="button"
                      onClick={() => handlePayout(r)}
                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--accent)', background: 'transparent', cursor: 'pointer' }}
                    >
                      Pagar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(r)}
                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 4, border: '1px solid var(--divider)', background: 'transparent', cursor: 'pointer' }}
                  >
                    {r.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
