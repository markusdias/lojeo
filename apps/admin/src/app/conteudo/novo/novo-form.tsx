'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MarkdownEditor } from '../../../components/blog/markdown-editor';
import { CoverUpload } from '../../../components/blog/cover-upload';

interface DraftResponse {
  ok: boolean;
  degraded?: boolean;
  draft?: {
    title: string;
    slug: string;
    excerpt: string;
    body: string;
  };
  error?: string;
  detail?: string;
  retryAfterSec?: number;
  cached?: boolean;
}

export function NovoPostForm() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<'editorial' | 'didatico' | 'inspirador'>('editorial');
  const [audience, setAudience] = useState('');

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiInfo, setAiInfo] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function generateDraft() {
    if (!topic.trim()) {
      setAiError('Informe um tópico antes de gerar.');
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAiInfo(null);
    try {
      const res = await fetch('/api/blog/ai-draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), tone, audience: audience.trim() || undefined }),
      });
      const data = (await res.json()) as DraftResponse;
      if (!res.ok || !data.ok || !data.draft) {
        if (res.status === 429) setAiError(`Limite IA atingido — tente em ${data.retryAfterSec ?? 60}s`);
        else if (res.status === 402) setAiError('Limite mensal de IA atingido — ajuste em /settings.');
        else setAiError(data.detail ?? data.error ?? 'Falha ao gerar draft.');
        return;
      }
      setTitle(data.draft.title);
      setExcerpt(data.draft.excerpt);
      setBody(data.draft.body);
      setAiInfo(
        data.degraded
          ? 'Draft em texto livre — revise e estruture antes de publicar.'
          : data.cached
          ? 'Reaproveitado do cache (mesmo tópico já gerado nas últimas 24h).'
          : 'Draft gerado — revise antes de publicar.',
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : String(err));
    } finally {
      setAiLoading(false);
    }
  }

  async function save(status: 'draft' | 'published') {
    if (!title.trim() || body.trim().length < 10) {
      setSaveError('Título e corpo (≥10 chars) obrigatórios.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim() || null,
          body,
          coverImageUrl: coverUrl.trim() || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? 'Falha ao salvar.');
        return;
      }
      router.push(`/conteudo/${data.post.id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
      {/* Painel IA assist */}
      <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-2)' }}>
          Rascunhar com IA
        </h2>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)', marginBottom: 'var(--space-4)' }}>
          Diga o tópico — a IA monta título, resumo e corpo em markdown. Você edita tudo abaixo.
        </p>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Tópico</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Como cuidar de joias de prata 925"
              className="lj-input"
              maxLength={300}
            />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Tom</span>
              <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)} className="lj-input">
                <option value="editorial">Editorial</option>
                <option value="didatico">Didático</option>
                <option value="inspirador">Inspirador</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Público (opcional)</span>
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="presenteadores procurando alianças"
                className="lj-input"
                maxLength={200}
              />
            </label>
          </div>
          <div>
            <button
              type="button"
              onClick={generateDraft}
              disabled={aiLoading || !topic.trim()}
              className="lj-btn-primary"
            >
              {aiLoading ? 'Gerando…' : 'Gerar draft com IA'}
            </button>
          </div>
          {aiError && (
            <p role="alert" style={{ color: 'var(--danger, #B91C1C)', fontSize: 'var(--text-body-s)' }}>{aiError}</p>
          )}
          {aiInfo && (
            <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)' }}>{aiInfo}</p>
          )}
        </div>
      </section>

      {/* Editor */}
      <section className="lj-card" style={{ padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--w-semibold)', marginBottom: 'var(--space-4)' }}>
          Conteúdo
        </h2>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="lj-input" maxLength={300} />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Resumo</span>
            <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="lj-input" maxLength={500} />
          </label>
          <CoverUpload value={coverUrl} onChange={setCoverUrl} />
          <MarkdownEditor value={body} onChange={setBody} label="Corpo (markdown)" rows={18} />
        </div>
        {saveError && (
          <p role="alert" style={{ color: 'var(--danger, #B91C1C)', fontSize: 'var(--text-body-s)', marginTop: 'var(--space-3)' }}>
            {saveError}
          </p>
        )}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button type="button" onClick={() => save('draft')} disabled={saving} className="lj-btn-secondary">
            {saving ? 'Salvando…' : 'Salvar como rascunho'}
          </button>
          <button type="button" onClick={() => save('published')} disabled={saving} className="lj-btn-primary">
            {saving ? 'Publicando…' : 'Publicar'}
          </button>
        </div>
      </section>
    </div>
  );
}
