'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function strToCents(s: string): number | null {
  const clean = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(clean);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [status, setStatus] = useState('draft');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-caption)',
    fontWeight: 'var(--w-medium)',
    color: 'var(--fg-secondary)',
    display: 'block',
    marginBottom: 'var(--space-1)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--track-wide)',
  };

  async function handleCreate() {
    if (!name.trim()) { setError('Nome obrigatório'); return; }
    const priceCents = strToCents(price);
    if (!priceCents) { setError('Preço inválido (ex: 99,90)'); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          priceCents,
          sku: sku.trim() || undefined,
          status,
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json() as { product?: { id: string }; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Falha ao criar');
      router.push(`/produtos/${data.product!.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produto');
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 'var(--space-8) var(--space-8) var(--space-12)', maxWidth: 680, margin: '0 auto' }}>
      <Link href="/produtos" style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)', textDecoration: 'none' }}>
        ← Produtos
      </Link>

      <header style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)' }}>
          Novo produto
        </h1>
        <p className="body-s" style={{ color: 'var(--fg-secondary)' }}>
          Preencha os dados básicos. Imagens, variantes e coleções podem ser adicionadas após criar.
        </p>
      </header>

      <div className="lj-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div>
          <label style={labelStyle}>Nome do produto *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="lj-input"
            style={{ width: '100%' }}
            placeholder="ex: Anel Solitário Ouro 18k"
            autoFocus
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Preço (R$) *</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="lj-input"
              style={{ width: '100%' }}
              placeholder="299,90"
            />
          </div>
          <div>
            <label style={labelStyle}>SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="lj-input"
              style={{ width: '100%' }}
              placeholder="PROD-001"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Status inicial</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="lj-input" style={{ width: '100%' }}>
            <option value="draft">Rascunho (não visível na loja)</option>
            <option value="active">Ativo (visível imediatamente)</option>
          </select>
        </div>

        <div>
          <label style={labelStyle}>Descrição (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="lj-input"
            style={{ width: '100%', resize: 'vertical' }}
            placeholder="Breve descrição do produto…"
          />
        </div>

        {error && (
          <p style={{ color: 'var(--error)', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
          <button onClick={handleCreate} disabled={saving} className="lj-btn-primary">
            {saving ? 'Criando…' : 'Criar produto'}
          </button>
          <Link href="/produtos">
            <button type="button" className="lj-btn-secondary">Cancelar</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
