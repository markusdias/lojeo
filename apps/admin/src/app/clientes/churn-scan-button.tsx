'use client';

import { useState } from 'react';

export function ChurnScanButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/cron/churn-check', { method: 'POST' });
      const d = (await r.json()) as { emitted?: number; skipped?: number; atRisk?: number; scanned?: number };
      if (r.ok) {
        const e = d.emitted ?? 0;
        const s = d.skipped ?? 0;
        const a = d.atRisk ?? 0;
        if (e === 0 && a === 0) {
          setResult('Nenhum cliente em risco crítico/alto agora.');
        } else {
          setResult(
            `${e} alerta${e === 1 ? '' : 's'} de churn criado${e === 1 ? '' : 's'}` +
            (s > 0 ? ` · ${s} já notificado${s === 1 ? '' : 's'} nos últimos 7 dias` : '') +
            ` · ${a} cliente${a === 1 ? '' : 's'} em risco`,
          );
        }
      } else {
        setResult('Falha ao verificar — tente novamente.');
      }
    } catch {
      setResult('Erro de rede.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{
          padding: '8px 14px',
          fontSize: 13,
          background: 'var(--fg)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.7 : 1,
          fontWeight: 500,
        }}
      >
        {busy ? 'Verificando…' : 'Verificar churn'}
      </button>
      {result && (
        <p style={{ fontSize: 12, color: 'var(--fg-secondary)', maxWidth: 280, textAlign: 'right', margin: 0 }}>
          {result}
        </p>
      )}
    </div>
  );
}
