'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

interface RowResult {
  row: number;
  status: 'ok' | 'error' | 'skipped';
  name?: string;
  id?: string;
  error?: string;
}

interface ImportResponse {
  inserted?: number;
  errors?: number;
  skipped?: number;
  total?: number;
  results?: RowResult[];
  error?: string;
  maxBytes?: number;
  max?: number;
}

const SAMPLE_CSV = `name,sku,price_cents,compare_price_cents,status,description,warranty_months
Anel Solitário Ouro 18k,LJ-001,449900,499900,active,Solitário com diamante 0.25ct,12
Brinco Argola Ouro,LJ-002,89900,,active,Argola fina lisa 22mm,12
Colar Ponto de Luz,LJ-003,129900,159900,draft,Pingente brilhante delicado,12`;

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lojeo-produtos-modelo.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/products/import?dry=${dryRun}`, {
        method: 'POST',
        body: fd,
      });
      const data = (await r.json()) as ImportResponse;
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 'var(--container-max)', margin: '0 auto' }} className="space-y-6">
      <header style={{ marginBottom: 24 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-muted)' }}>
          Catálogo · importação em lote
        </span>
        <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 600 }}>Importar produtos via CSV</h1>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--fg-secondary)' }}>
          Suba uma planilha com até 500 linhas. Validamos cada linha antes — você confirma só se tudo estiver ok.
        </p>
      </header>

      <div className="lj-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>1. Modelo da planilha</h2>
        <p style={{ fontSize: 13, color: 'var(--fg-secondary)', marginBottom: 12 }}>
          Colunas obrigatórias: <code>name</code>, <code>price_cents</code>. Opcionais: <code>sku</code>, <code>slug</code>, <code>compare_price_cents</code>, <code>status</code> (draft/active/archived), <code>description</code>, <code>warranty_months</code>.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={downloadSample}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              background: 'transparent',
              color: 'var(--fg)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Baixar modelo CSV
          </button>
        </div>
      </div>

      <form className="lj-card" style={{ padding: 20 }} onSubmit={handleSubmit}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>2. Subir arquivo</h2>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{
            display: 'block',
            width: '100%',
            padding: 12,
            border: '1px dashed var(--border)',
            borderRadius: 8,
            background: 'var(--neutral-50, #fafaf8)',
            fontSize: 13,
            marginBottom: 12,
          }}
        />
        {file && (
          <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 12 }}>
            {file.name} · {(file.size / 1024).toFixed(1)} KB
          </p>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            style={{ accentColor: 'var(--accent, #C9A85C)' }}
          />
          <span>Validar antes de inserir (dry-run) — recomendado</span>
        </label>

        <button
          type="submit"
          disabled={!file || busy}
          style={{
            padding: '10px 20px',
            fontSize: 14,
            background: 'var(--fg)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: !file || busy ? 'not-allowed' : 'pointer',
            opacity: !file || busy ? 0.6 : 1,
            fontWeight: 500,
          }}
        >
          {busy ? 'Processando…' : dryRun ? 'Validar planilha' : 'Importar agora'}
        </button>
      </form>

      {result && (
        <div className="lj-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>3. Resultado</h2>
          {result.error ? (
            <p style={{ color: 'var(--error)', fontSize: 13 }}>
              Erro: <code>{result.error}</code>
              {result.maxBytes && ` (limite ${(result.maxBytes / 1024 / 1024).toFixed(1)} MB)`}
              {result.max && ` (máximo ${result.max} linhas)`}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <Stat label="Total" value={result.total ?? 0} />
                <Stat label={dryRun ? 'Válidas' : 'Inseridas'} value={result.inserted ?? 0} ok />
                <Stat label="Erros" value={result.errors ?? 0} bad={result.errors ? result.errors > 0 : false} />
                {result.skipped !== undefined && result.skipped > 0 && (
                  <Stat label="Puladas" value={result.skipped} />
                )}
              </div>

              {result.results && result.results.length > 0 && (
                <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)' }}>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: 8, fontWeight: 500, color: 'var(--fg-secondary)' }}>Linha</th>
                        <th style={{ textAlign: 'left', padding: 8, fontWeight: 500, color: 'var(--fg-secondary)' }}>Produto</th>
                        <th style={{ textAlign: 'left', padding: 8, fontWeight: 500, color: 'var(--fg-secondary)' }}>Status</th>
                        <th style={{ textAlign: 'left', padding: 8, fontWeight: 500, color: 'var(--fg-secondary)' }}>Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.results.map((r) => (
                        <tr key={r.row} style={{ borderBottom: '1px solid var(--border-subtle, #f0f0f0)' }}>
                          <td style={{ padding: 8, fontFamily: 'monospace', color: 'var(--fg-muted)' }}>{r.row}</td>
                          <td style={{ padding: 8 }}>{r.name ?? '—'}</td>
                          <td style={{ padding: 8 }}>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: r.status === 'ok' ? 'var(--success-soft)' : r.status === 'error' ? 'var(--error-soft)' : 'var(--neutral-50)',
                              color: r.status === 'ok' ? 'var(--success)' : r.status === 'error' ? 'var(--error)' : 'var(--fg-muted)',
                              fontWeight: 600,
                            }}>
                              {r.status === 'ok' ? '✓ OK' : r.status === 'error' ? '✕ Erro' : 'Pulada'}
                            </span>
                          </td>
                          <td style={{ padding: 8, color: 'var(--fg-muted)' }}>{r.error ?? r.id ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dryRun && (result.errors === 0 || result.errors === undefined) && (result.inserted ?? 0) > 0 && (
                <div style={{ marginTop: 16, padding: 12, background: 'var(--success-soft)', borderRadius: 8, fontSize: 13 }}>
                  Planilha válida. Desmarque o dry-run e importe.
                </div>
              )}
              {!dryRun && (result.inserted ?? 0) > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Link
                    href="/products"
                    style={{
                      display: 'inline-block',
                      padding: '8px 16px',
                      background: 'var(--fg)',
                      color: '#fff',
                      borderRadius: 8,
                      textDecoration: 'none',
                      fontSize: 13,
                    }}
                  >
                    Ver produtos →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, ok, bad }: { label: string; value: number; ok?: boolean; bad?: boolean }) {
  const color = ok ? 'var(--success)' : bad ? 'var(--error)' : 'var(--fg)';
  return (
    <div style={{ minWidth: 100 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--fg-muted)', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 600, color, margin: '4px 0 0' }}>{value}</p>
    </div>
  );
}
