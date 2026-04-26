'use client';

import { useState } from 'react';

interface ProductData {
  id: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  priceCents: number;
  status: string;
  customFields: Record<string, unknown>;
}

export function ProductEditClient({ product }: { product: ProductData }) {
  const [description, setDescription] = useState(product.description);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle);
  const [seoDescription, setSeoDescription] = useState(product.seoDescription);
  const [keyword, setKeyword] = useState('');
  const [tier, setTier] = useState<'sonnet' | 'haiku'>('sonnet');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [aiCost, setAiCost] = useState<{ model: string; cached: boolean; costUsdMicro: number } | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}/ai-copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword || undefined, tier }),
      });
      const data = await res.json() as {
        copy?: {
          long_description?: string;
          short_description?: string;
          seo_title?: string;
          seo_description?: string;
        };
        model?: string;
        cached?: boolean;
        costUsdMicro?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido');
      if (data.copy) {
        setDescription(data.copy.long_description ?? description);
        setSeoTitle(data.copy.seo_title ?? seoTitle);
        setSeoDescription(data.copy.seo_description ?? seoDescription);
        setAiCost({ model: data.model ?? '', cached: !!data.cached, costUsdMicro: data.costUsdMicro ?? 0 });
        setMessage({ type: 'ok', text: 'Copy gerada — revise antes de salvar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao gerar' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, seoTitle, seoDescription }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setMessage({ type: 'ok', text: 'Produto salvo com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao salvar' });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 6,
    fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' as const,
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Campos básicos read-only */}
      <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 }}>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Preço: <strong>{(product.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Status: <strong>{product.status}</strong></p>
        {Object.keys(product.customFields).length > 0 && (
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, margin: '8px 0 0' }}>
            Campos custom: {Object.entries(product.customFields).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
          </p>
        )}
      </div>

      {/* Gerador IA */}
      <div style={{ border: '1px solid #DBEAFE', borderRadius: 8, padding: 20, background: '#EFF6FF' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', marginBottom: 16 }}>
          ✦ Gerar com IA
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Keyword primária (opcional)</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ex: anel de ouro 18k"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Modelo</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as 'sonnet' | 'haiku')} style={{ ...inputStyle, width: 'auto' }}>
              <option value="sonnet">Sonnet (padrão)</option>
              <option value="haiku">Haiku (econômico)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            background: generating ? '#93C5FD' : '#2563EB', color: 'white',
            border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 14,
            fontWeight: 500, cursor: generating ? 'wait' : 'pointer',
          }}
        >
          {generating ? 'Gerando...' : 'Gerar descrição + SEO'}
        </button>
        {aiCost && (
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
            Modelo: {aiCost.model} · {aiCost.cached ? 'Cache ✓' : 'Nova geração'} · Custo: ${(aiCost.costUsdMicro / 1_000_000).toFixed(5)}
          </p>
        )}
      </div>

      {/* Descrição */}
      <div>
        <label style={labelStyle}>Descrição do produto</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
        <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{description.length} chars</p>
      </div>

      {/* SEO */}
      <div>
        <label style={labelStyle}>SEO title <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({seoTitle.length}/60 chars)</span></label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          maxLength={70}
          style={{ ...inputStyle, borderColor: seoTitle.length > 60 ? '#EF4444' : '#E5E7EB' }}
        />
      </div>

      <div>
        <label style={labelStyle}>Meta description <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({seoDescription.length}/160 chars)</span></label>
        <textarea
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          rows={3}
          maxLength={180}
          style={{ ...inputStyle, resize: 'vertical' as const, borderColor: seoDescription.length > 160 ? '#EF4444' : '#E5E7EB' }}
        />
      </div>

      {/* Mensagem feedback */}
      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 6, fontSize: 14,
          background: message.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
          color: message.type === 'ok' ? '#166534' : '#991B1B',
          border: `1px solid ${message.type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Salvar */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? '#9CA3AF' : '#111827', color: 'white',
            border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14,
            fontWeight: 500, cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
