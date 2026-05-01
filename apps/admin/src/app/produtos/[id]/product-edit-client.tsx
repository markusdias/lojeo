'use client';

import { useState } from 'react';
import { ImageUpload, type UploadedPayload } from '@/components/products/image-upload';

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

interface UploadedImage {
  id: string;
  url: string;
  altText: string | null;
  variant: 'original' | 'nobg';
}

export function ProductEditClient({
  product,
  removeBgEnabled = false,
}: {
  product: ProductData;
  removeBgEnabled?: boolean;
}) {
  const [description, setDescription] = useState(product.description);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle);
  const [seoDescription, setSeoDescription] = useState(product.seoDescription);
  const [keyword, setKeyword] = useState('');
  const [tier, setTier] = useState<'sonnet' | 'haiku'>('sonnet');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [aiCost, setAiCost] = useState<{ model: string; cached: boolean; costUsdMicro: number } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  function handleUploaded(payload: UploadedPayload) {
    setUploadNotice(null);
    const next: UploadedImage[] = [];
    if (payload.image) {
      next.push({ ...payload.image, variant: 'original' });
    }
    if (payload.nobgImage) {
      next.push({ ...payload.nobgImage, variant: 'nobg' });
    }
    if (next.length > 0) {
      setUploadedImages(prev => [...next, ...prev].slice(0, 12));
    }
    if (payload.nobgError) {
      setUploadNotice(`Imagem salva, mas remoção de fundo falhou: ${payload.nobgError}`);
    }
  }

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

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-caption)',
    fontWeight: 'var(--w-medium)',
    color: 'var(--fg-secondary)',
    display: 'block',
    marginBottom: 'var(--space-2)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--track-wide)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Campos básicos read-only */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <p className="body-s" style={{ marginBottom: 'var(--space-2)' }}>
          Preço: <strong className="numeric">{(product.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </p>
        <p className="body-s" style={{ margin: 0 }}>
          Status: <span className="lj-badge lj-badge-accent">{product.status}</span>
        </p>
        {Object.keys(product.customFields).length > 0 && (
          <p className="body-s" style={{ margin: 'var(--space-2) 0 0', color: 'var(--fg-secondary)' }}>
            Campos custom: {Object.entries(product.customFields).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
          </p>
        )}
      </div>

      {/* Upload de imagens com Remove.bg opcional */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', margin: 0 }}>
            Imagens do produto
          </h2>
          {removeBgEnabled ? (
            <span className="lj-badge lj-badge-accent" style={{ alignSelf: 'center' }}>Remove.bg ativo</span>
          ) : (
            <span
              className="lj-badge"
              title="Configure REMOVE_BG_KEY em variáveis de ambiente para habilitar remoção de fundo automática"
              style={{ alignSelf: 'center', cursor: 'help' }}
            >
              Remove.bg desabilitado
            </span>
          )}
        </div>
        <ImageUpload
          productId={product.id}
          removeBgEnabled={removeBgEnabled}
          onUploaded={handleUploaded}
        />
        {uploadNotice && (
          <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--fg-secondary)' }}>
            {uploadNotice}
          </p>
        )}
        {uploadedImages.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 'var(--space-3)' }}>
            {uploadedImages.map((img) => (
              <figure key={`${img.id}-${img.variant}`} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <div style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-subtle, #f5f0e8)' }}>
                  <img
                    src={img.url}
                    alt={img.altText ?? 'Imagem do produto'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <figcaption className="caption" style={{ textAlign: 'center' }}>
                  {img.variant === 'nobg' ? 'Sem fundo' : 'Original'}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>

      {/* Gerador IA — banner verde claro */}
      <div className="lj-ai-banner" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
          <p className="lj-ai-eyebrow">IA · GERADOR DE COPY</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <div>
            <label style={labelStyle}>Keyword primária (opcional)</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ex: anel de ouro 18k"
              className="lj-input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Modelo</label>
            <select value={tier} onChange={(e) => setTier(e.target.value as 'sonnet' | 'haiku')} className="lj-input" style={{ width: 'auto' }}>
              <option value="sonnet">Sonnet (padrão)</option>
              <option value="haiku">Haiku (econômico)</option>
            </select>
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="lj-btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {generating ? 'Gerando...' : 'Gerar descrição + SEO'}
        </button>
        {aiCost && (
          <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
            Modelo: <span className="mono">{aiCost.model}</span> · {aiCost.cached ? 'Cache ✓' : 'Nova geração'} · Custo: <span className="numeric">${(aiCost.costUsdMicro / 1_000_000).toFixed(5)}</span>
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
          className="lj-input"
          style={{ width: '100%', resize: 'vertical' }}
        />
        <p className="caption" style={{ marginTop: 'var(--space-1)' }}>{description.length} chars</p>
      </div>

      {/* SEO */}
      <div>
        <label style={labelStyle}>
          SEO title <span style={{ fontWeight: 'var(--w-regular)', color: 'var(--fg-muted)', textTransform: 'none', letterSpacing: 0 }}>
            ({seoTitle.length}/60 chars)
          </span>
        </label>
        <input
          type="text"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
          maxLength={70}
          className="lj-input"
          style={{ width: '100%', borderColor: seoTitle.length > 60 ? 'var(--error)' : undefined }}
        />
      </div>

      <div>
        <label style={labelStyle}>
          Meta description <span style={{ fontWeight: 'var(--w-regular)', color: 'var(--fg-muted)', textTransform: 'none', letterSpacing: 0 }}>
            ({seoDescription.length}/160 chars)
          </span>
        </label>
        <textarea
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
          rows={3}
          maxLength={180}
          className="lj-input"
          style={{ width: '100%', resize: 'vertical', borderColor: seoDescription.length > 160 ? 'var(--error)' : undefined }}
        />
      </div>

      {/* Mensagem feedback */}
      {message && (
        <div className="lj-card" style={{
          padding: 'var(--space-3) var(--space-4)',
          background: message.type === 'ok' ? 'var(--success-soft)' : 'var(--error-soft)',
          borderColor: message.type === 'ok' ? 'var(--success)' : 'var(--error)',
        }}>
          <p className="body-s" style={{ color: message.type === 'ok' ? 'var(--success)' : 'var(--error)' }}>
            {message.text}
          </p>
        </div>
      )}

      {/* Salvar */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="lj-btn-primary"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
