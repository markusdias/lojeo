'use client';

import { useState } from 'react';
import { MarkdownEditor } from '@/components/blog/markdown-editor';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { ImagesGallery } from './images-gallery';
import { VariantsEditor, type Variant } from './variants-editor';
import { CollectionsSelector } from './collections-selector';

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  status: string;
  priceCents: number;
  comparePriceCents: number | null;
  costCents: number | null;
  ncm: string;
  taxRegime: string;
  warrantyMonths: number;
  returnDays: number | null;
  nonReturnable: boolean;
  exportRestrictions: Record<string, unknown>;
  presaleShipDate: string | null;
  seoTitle: string;
  seoDescription: string;
  customFields: Record<string, unknown>;
}

interface GalleryImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

interface CollectionRef {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  product: ProductData;
  initialVariants: Variant[];
  initialImages: GalleryImage[];
  initialProductCollections: CollectionRef[];
  allCollections: CollectionRef[];
  removeBgEnabled: boolean;
}

function centsToStr(cents: number | null): string {
  if (cents === null) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}

function strToCents(s: string): number | null {
  const clean = s.replace(',', '.').replace(/[^\d.]/g, '');
  const n = parseFloat(clean);
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}

function sectionLabel(text: string): React.ReactNode {
  return (
    <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', margin: '0 0 var(--space-4)' }}>
      {text}
    </h2>
  );
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
};

export function ProductEditClient({
  product,
  initialVariants,
  initialImages,
  initialProductCollections,
  allCollections,
  removeBgEnabled,
}: Props) {
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [sku, setSku] = useState(product.sku);
  const [status, setStatus] = useState(product.status);
  const [price, setPrice] = useState(centsToStr(product.priceCents));
  const [comparePrice, setComparePrice] = useState(centsToStr(product.comparePriceCents));
  const [cost, setCost] = useState(centsToStr(product.costCents));
  const [description, setDescription] = useState(product.description);
  const [seoTitle, setSeoTitle] = useState(product.seoTitle);
  const [seoDescription, setSeoDescription] = useState(product.seoDescription);
  const [ncm, setNcm] = useState(product.ncm);
  const [taxRegime, setTaxRegime] = useState(product.taxRegime);
  const [warrantyMonths, setWarrantyMonths] = useState(String(product.warrantyMonths));
  const [returnDays, setReturnDays] = useState(product.returnDays !== null ? String(product.returnDays) : '');
  const [nonReturnable, setNonReturnable] = useState(product.nonReturnable);
  const [presaleShipDate, setPresaleShipDate] = useState(
    product.presaleShipDate ? product.presaleShipDate.slice(0, 16) : '',
  );
  const [exportBlocklist, setExportBlocklist] = useState<string[]>(
    Array.isArray((product.exportRestrictions as Record<string, unknown>).blockedCountries)
      ? (product.exportRestrictions.blockedCountries as string[])
      : [],
  );
  const [exportInput, setExportInput] = useState('');

  const [generating, setGenerating] = useState(false);
  const [aiKeyword, setAiKeyword] = useState('');
  const [aiTier, setAiTier] = useState<'sonnet' | 'haiku'>('sonnet');
  const [aiCost, setAiCost] = useState<{ model: string; cached: boolean; costUsdMicro: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(exportBlocklist.length > 0);

  const labelStyle: React.CSSProperties = {
    fontSize: 'var(--text-caption)',
    fontWeight: 'var(--w-medium)',
    color: 'var(--fg-secondary)',
    display: 'block',
    marginBottom: 'var(--space-1)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--track-wide)',
  };

  async function handleSave() {
    const priceCents = strToCents(price);
    if (!priceCents || priceCents <= 0) {
      setMessage({ type: 'error', text: 'Preço inválido.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        slug: slug.trim(),
        sku: sku.trim() || undefined,
        status,
        priceCents,
        comparePriceCents: strToCents(comparePrice),
        costCents: strToCents(cost),
        description,
        seoTitle,
        seoDescription,
        ncm: ncm.trim() || undefined,
        taxRegime: taxRegime.trim() || undefined,
        warrantyMonths: parseInt(warrantyMonths, 10) || 12,
        returnDays: nonReturnable ? 0 : (returnDays ? parseInt(returnDays, 10) : null),
        nonReturnable,
        exportRestrictions: exportBlocklist.length > 0 ? { blockedCountries: exportBlocklist } : {},
        presaleShipDate: presaleShipDate ? new Date(presaleShipDate).toISOString() : null,
      };
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? 'Falha ao salvar');
      }
      setMessage({ type: 'ok', text: 'Produto salvo com sucesso.' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}/ai-copy`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keyword: aiKeyword || undefined, tier: aiTier }),
      });
      const data = await res.json() as {
        copy?: { long_description?: string; seo_title?: string; seo_description?: string };
        model?: string;
        cached?: boolean;
        costUsdMicro?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar');
      if (data.copy) {
        if (data.copy.long_description) setDescription(data.copy.long_description);
        if (data.copy.seo_title) setSeoTitle(data.copy.seo_title);
        if (data.copy.seo_description) setSeoDescription(data.copy.seo_description);
        setAiCost({ model: data.model ?? '', cached: !!data.cached, costUsdMicro: data.costUsdMicro ?? 0 });
        setMessage({ type: 'ok', text: 'Copy gerada — revise antes de salvar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Falha ao gerar' });
    } finally {
      setGenerating(false);
    }
  }

  function addBlockedCountry() {
    const code = exportInput.trim().toUpperCase().slice(0, 2);
    if (code.length === 2 && !exportBlocklist.includes(code)) {
      setExportBlocklist((prev) => [...prev, code]);
    }
    setExportInput('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* ── Informações básicas ─────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('Informações básicas')}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Nome do produto</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="lj-input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={labelStyle}>
              Slug (URL)
              <InfoTooltip text="Parte da URL do produto. Alterar cria redirect 301 automático." />
            </label>
            <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="nome-do-produto" />
            <p className="caption" style={{ marginTop: 2, color: 'var(--fg-muted)' }}>/produto/{slug || '…'}</p>
          </div>
          <div>
            <label style={labelStyle}>SKU</label>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="PROD-001" />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="lj-input" style={{ width: '100%' }}>
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Preços ──────────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('Preços')}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>Preço (R$) *</label>
            <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="0,00" />
          </div>
          <div>
            <label style={labelStyle}>
              Preço original (R$)
              <InfoTooltip text="Preço antes do desconto. Aparece riscado na loja." />
            </label>
            <input type="text" value={comparePrice} onChange={(e) => setComparePrice(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="vazio = sem riscado" />
          </div>
          <div>
            <label style={labelStyle}>
              Custo (R$)
              <InfoTooltip text="Custo de aquisição. Usado para calcular margem nos relatórios. Não exibido na loja." />
            </label>
            <input type="text" value={cost} onChange={(e) => setCost(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="vazio = sem cálculo" />
          </div>
        </div>
        {strToCents(price) !== null && strToCents(cost) !== null && strToCents(price)! > 0 && strToCents(cost)! > 0 && (
          <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--fg-secondary)' }}>
            Margem bruta estimada: <strong className="numeric">
              {(((strToCents(price)! - strToCents(cost)!) / strToCents(price)!) * 100).toFixed(1)}%
            </strong>
          </p>
        )}
      </div>

      {/* ── Imagens ─────────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          {sectionLabel('Imagens')}
          {removeBgEnabled
            ? <span className="lj-badge lj-badge-accent" style={{ alignSelf: 'center' }}>Remove.bg ativo</span>
            : <span className="lj-badge" style={{ alignSelf: 'center', cursor: 'help' }} title="Configure REMOVE_BG_KEY para habilitar">Remove.bg desabilitado</span>
          }
        </div>
        <ImagesGallery productId={product.id} initialImages={initialImages} removeBgEnabled={removeBgEnabled} />
      </div>

      {/* ── Descrição ───────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('Descrição')}
        <MarkdownEditor value={description} onChange={setDescription} rows={12} label="Suporta Markdown" />
      </div>

      {/* ── SEO + AI ────────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('SEO')}
        <div className="lj-ai-banner" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <span aria-hidden style={{ fontSize: 18, color: 'var(--accent)' }}>✦</span>
            <p className="lj-ai-eyebrow">IA · GERADOR DE COPY</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <div>
              <label style={labelStyle}>Keyword primária (opcional)</label>
              <input type="text" value={aiKeyword} onChange={(e) => setAiKeyword(e.target.value)} placeholder="ex: anel de ouro 18k" className="lj-input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Modelo</label>
              <select value={aiTier} onChange={(e) => setAiTier(e.target.value as 'sonnet' | 'haiku')} className="lj-input" style={{ width: 'auto' }}>
                <option value="sonnet">Sonnet (padrão)</option>
                <option value="haiku">Haiku (econômico)</option>
              </select>
            </div>
          </div>
          <button onClick={handleGenerate} disabled={generating} className="lj-btn-primary" style={{ alignSelf: 'flex-start' }}>
            {generating ? 'Gerando…' : 'Gerar descrição + SEO'}
          </button>
          {aiCost && (
            <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
              Modelo: <span className="mono">{aiCost.model}</span> · {aiCost.cached ? 'Cache ✓' : 'Nova geração'} · Custo: <span className="numeric">${(aiCost.costUsdMicro / 1_000_000).toFixed(5)}</span>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label style={labelStyle}>
              SEO title <span style={{ fontWeight: 'var(--w-regular)', color: 'var(--fg-muted)', textTransform: 'none', letterSpacing: 0 }}>({seoTitle.length}/60)</span>
            </label>
            <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={70} className="lj-input" style={{ width: '100%', borderColor: seoTitle.length > 60 ? 'var(--error)' : undefined }} />
          </div>
          <div>
            <label style={labelStyle}>
              Meta description <span style={{ fontWeight: 'var(--w-regular)', color: 'var(--fg-muted)', textTransform: 'none', letterSpacing: 0 }}>({seoDescription.length}/160)</span>
            </label>
            <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} maxLength={180} className="lj-input" style={{ width: '100%', resize: 'vertical', borderColor: seoDescription.length > 160 ? 'var(--error)' : undefined }} />
          </div>
        </div>
      </div>

      {/* ── Variantes ───────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('Variantes')}
        <VariantsEditor productId={product.id} initialVariants={initialVariants} />
      </div>

      {/* ── Coleções ────────────────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        {sectionLabel('Coleções')}
        <CollectionsSelector
          productId={product.id}
          initialProductCollections={initialProductCollections}
          allCollections={allCollections}
        />
      </div>

      {/* ── Fiscal e operações ──────────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', margin: 0 }}>
            Fiscal e operações
          </h2>
          <span style={{ color: 'var(--fg-secondary)', fontSize: 18 }}>{advancedOpen ? '▲' : '▼'}</span>
        </button>
        {advancedOpen && (
          <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div>
              <label style={labelStyle}>
                NCM
                <InfoTooltip text="Nomenclatura Comum do Mercosul. Obrigatório para NF-e." />
              </label>
              <input type="text" value={ncm} onChange={(e) => setNcm(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="0000.00.00" maxLength={16} />
            </div>
            <div>
              <label style={labelStyle}>Regime tributário</label>
              <input type="text" value={taxRegime} onChange={(e) => setTaxRegime(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="ex: simples_nacional" />
            </div>
            <div>
              <label style={labelStyle}>
                Garantia (meses)
                <InfoTooltip text="Gravado no pedido no momento da compra." />
              </label>
              <input type="number" min={0} value={warrantyMonths} onChange={(e) => setWarrantyMonths(e.target.value)} className="lj-input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Prazo de troca (dias)</label>
              <input type="number" min={0} value={returnDays} onChange={(e) => setReturnDays(e.target.value)} className="lj-input" style={{ width: '100%' }} placeholder="vazio = padrão da loja" disabled={nonReturnable} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                id={`nonreturnable-${product.id}`}
                checked={nonReturnable}
                onChange={(e) => setNonReturnable(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor={`nonreturnable-${product.id}`} style={{ fontSize: 'var(--text-body-s)', cursor: 'pointer' }}>
                Produto sem troca (ex: itens de higiene)
              </label>
            </div>
            <div>
              <label style={labelStyle}>
                Data de pré-venda
                <InfoTooltip text="Se preenchida, produto fica em modo pré-venda até esta data." />
              </label>
              <input type="datetime-local" value={presaleShipDate} onChange={(e) => setPresaleShipDate(e.target.value)} className="lj-input" style={{ width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Restrições de exportação ────────────────────────────────────── */}
      <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
        <button
          type="button"
          onClick={() => setExportOpen((v) => !v)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--w-semibold)', letterSpacing: 'var(--track-tight)', margin: 0 }}>
            Restrições de exportação
            {exportBlocklist.length > 0 && (
              <span className="lj-badge lj-badge-warning" style={{ marginLeft: 8, fontSize: 11 }}>{exportBlocklist.length} país(es) bloqueado(s)</span>
            )}
          </h2>
          <span style={{ color: 'var(--fg-secondary)', fontSize: 18 }}>{exportOpen ? '▲' : '▼'}</span>
        </button>
        {exportOpen && (
          <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p className="caption" style={{ color: 'var(--fg-secondary)' }}>
              Países bloqueados (código ISO-3166-1 alpha-2, ex: US, DE, FR). O checkout bloqueia automaticamente.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {exportBlocklist.map((code) => (
                <span key={code} className="lj-badge lj-badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {code}
                  <button type="button" onClick={() => setExportBlocklist((prev) => prev.filter((c) => c !== code))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, color: 'inherit', fontSize: 14 }}>×</button>
                </span>
              ))}
              {exportBlocklist.length === 0 && <span className="caption" style={{ color: 'var(--fg-muted)' }}>Nenhum país bloqueado.</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                value={exportInput}
                onChange={(e) => setExportInput(e.target.value.toUpperCase().slice(0, 2))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBlockedCountry(); } }}
                className="lj-input"
                style={{ width: 80 }}
                placeholder="US"
                maxLength={2}
              />
              <button type="button" className="lj-btn-secondary" onClick={addBlockedCountry}>Bloquear</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Campos customizados (read-only) ─────────────────────────────── */}
      {Object.keys(product.customFields).length > 0 && (
        <div className="lj-card" style={{ padding: 'var(--space-5)' }}>
          {sectionLabel('Campos do template')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {Object.entries(product.customFields).map(([k, v]) => (
              <span key={k} className="lj-badge lj-badge-neutral">
                {k}: {String(v)}
              </span>
            ))}
          </div>
          <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--fg-muted)' }}>
            Campos definidos pelo template ativo. Editáveis via API.
          </p>
        </div>
      )}

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {message && (
        <div className="lj-card" style={{
          padding: 'var(--space-3) var(--space-4)',
          background: message.type === 'ok' ? 'var(--success-soft)' : 'var(--error-soft)',
          borderColor: message.type === 'ok' ? 'var(--success)' : 'var(--error)',
        }}>
          <p className="body-s" style={{ color: message.type === 'ok' ? 'var(--success)' : 'var(--error)', margin: 0 }}>
            {message.text}
          </p>
        </div>
      )}

      {/* ── Salvar ──────────────────────────────────────────────────────── */}
      <div>
        <button onClick={handleSave} disabled={saving} className="lj-btn-primary">
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}
