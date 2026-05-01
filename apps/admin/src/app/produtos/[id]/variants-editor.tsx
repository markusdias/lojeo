'use client';

import { useState } from 'react';

export interface Variant {
  id: string;
  sku: string;
  name: string;
  optionValues: Record<string, string>;
  priceCents: number | null;
  stockQty: number;
  barcode: string;
}

interface Props {
  productId: string;
  initialVariants: Variant[];
}

const EMPTY_FORM = {
  sku: '',
  name: '',
  priceCents: '',
  stockQty: '0',
  barcode: '',
  options: [{ key: '', value: '' }] as { key: string; value: string }[],
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function centsToStr(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function strToCents(s: string): number | null {
  const clean = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(clean);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export function VariantsEditor({ productId, initialVariants }: Props) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }

  function openEdit(v: Variant) {
    const options = Object.entries(v.optionValues).map(([key, value]) => ({ key, value }));
    setForm({
      sku: v.sku,
      name: v.name,
      priceCents: centsToStr(v.priceCents),
      stockQty: String(v.stockQty),
      barcode: v.barcode,
      options: options.length > 0 ? options : [{ key: '', value: '' }],
    });
    setEditingId(v.id);
    setAdding(true);
    setError(null);
  }

  function addOption() {
    if (form.options.length >= 3) return;
    setForm((f) => ({ ...f, options: [...f.options, { key: '', value: '' }] }));
  }

  function removeOption(idx: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
  }

  function buildOptionValues(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const { key, value } of form.options) {
      if (key.trim()) out[key.trim()] = value.trim();
    }
    return out;
  }

  async function handleSave() {
    if (!form.sku.trim()) { setError('SKU obrigatório'); return; }
    setBusy(true);
    setError(null);
    const body = {
      sku: form.sku.trim(),
      name: form.name.trim() || undefined,
      optionValues: buildOptionValues(),
      priceCents: strToCents(form.priceCents),
      stockQty: parseInt(form.stockQty, 10) || 0,
      barcode: form.barcode.trim() || undefined,
    };
    try {
      if (editingId) {
        const res = await fetch(`/api/products/${productId}/variants/${editingId}`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json() as { variant?: Variant; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Erro ao salvar');
        setVariants((prev) => prev.map((v) => v.id === editingId ? { ...v, ...data.variant! } : v));
      } else {
        const res = await fetch(`/api/products/${productId}/variants`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json() as { variant?: Variant; error?: string };
        if (!res.ok) throw new Error(data.error ?? 'Erro ao criar');
        setVariants((prev) => [...prev, data.variant!]);
      }
      setAdding(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(variantId: string) {
    setBusy(true);
    try {
      await fetch(`/api/products/${productId}/variants/${variantId}`, { method: 'DELETE' });
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } finally {
      setBusy(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-caption)',
    fontWeight: 'var(--w-medium)',
    color: 'var(--fg-secondary)',
    display: 'block',
    marginBottom: 'var(--space-1)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--track-wide)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {variants.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-subtle)' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>SKU</th>
                <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>Opções</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Preço</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>Estoque</th>
                <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 10px' }} className="mono">{v.sku}</td>
                  <td style={{ padding: '8px 10px', color: 'var(--fg-secondary)' }}>
                    {Object.entries(v.optionValues).map(([k, val]) => (
                      <span key={k} className="lj-badge lj-badge-neutral" style={{ marginRight: 4, fontSize: 11 }}>
                        {k}: {val}
                      </span>
                    ))}
                    {Object.keys(v.optionValues).length === 0 && <span style={{ color: 'var(--fg-muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }} className="numeric">
                    {v.priceCents !== null ? formatBRL(v.priceCents) : <span style={{ color: 'var(--fg-muted)' }}>Padrão</span>}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }} className="numeric">{v.stockQty}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <button type="button" className="lj-btn-secondary" style={{ fontSize: 12, padding: '2px 10px', marginRight: 4 }} onClick={() => openEdit(v)} disabled={busy}>
                      Editar
                    </button>
                    <button type="button" className="lj-btn-danger" style={{ fontSize: 12, padding: '2px 10px' }} onClick={() => handleDelete(v.id)} disabled={busy}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="caption" style={{ color: 'var(--fg-muted)' }}>Nenhuma variante. Adicione abaixo para gerenciar opções como tamanho, cor e material.</p>
      )}

      {!adding && (
        <button type="button" className="lj-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={openAdd}>
          + Adicionar variante
        </button>
      )}

      {adding && (
        <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body-s)', margin: 0 }}>
            {editingId ? 'Editar variante' : 'Nova variante'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>SKU *</label>
              <input type="text" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="lj-input" style={{ width: '100%' }} placeholder="EX-001-P-AZ" />
            </div>
            <div>
              <label style={labelStyle}>Nome (opcional)</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="lj-input" style={{ width: '100%' }} placeholder="ex: Azul P" />
            </div>
            <div>
              <label style={labelStyle}>Preço (R$, vazio = padrão)</label>
              <input type="text" value={form.priceCents} onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))} className="lj-input" style={{ width: '100%' }} placeholder="0,00" />
            </div>
            <div>
              <label style={labelStyle}>Estoque</label>
              <input type="number" min={0} value={form.stockQty} onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))} className="lj-input" style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Opções (até 3)</label>
            {form.options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)', alignItems: 'center' }}>
                <input
                  type="text"
                  value={opt.key}
                  onChange={(e) => setForm((f) => ({ ...f, options: f.options.map((o, i) => i === idx ? { ...o, key: e.target.value } : o) }))}
                  className="lj-input"
                  style={{ flex: 1 }}
                  placeholder="Atributo (ex: Tamanho)"
                />
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => setForm((f) => ({ ...f, options: f.options.map((o, i) => i === idx ? { ...o, value: e.target.value } : o) }))}
                  className="lj-input"
                  style={{ flex: 1 }}
                  placeholder="Valor (ex: P)"
                />
                {form.options.length > 1 && (
                  <button type="button" onClick={() => removeOption(idx)} className="lj-btn-danger" style={{ padding: '4px 8px', fontSize: 12 }}>×</button>
                )}
              </div>
            ))}
            {form.options.length < 3 && (
              <button type="button" onClick={addOption} className="lj-btn-secondary" style={{ fontSize: 12, padding: '2px 10px' }}>
                + Opção
              </button>
            )}
          </div>

          {error && <p style={{ color: 'var(--error)', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="lj-btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar'}
            </button>
            <button type="button" className="lj-btn-secondary" onClick={() => { setAdding(false); setEditingId(null); }} disabled={busy}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
