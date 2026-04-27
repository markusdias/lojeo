'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PostInput {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  status: 'draft' | 'published';
}

export function EditPostForm({ post }: { post: PostInput }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [body, setBody] = useState(post.body);
  const [coverUrl, setCoverUrl] = useState(post.coverImageUrl);
  const [status, setStatus] = useState<'draft' | 'published'>(post.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim() || null,
          body,
          coverImageUrl: coverUrl.trim() || null,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Falha ao salvar.');
        return;
      }
      setInfo('Salvo.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm('Excluir este post? Esta ação não pode ser desfeita.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Falha ao excluir.');
        return;
      }
      router.push('/conteudo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lj-card" style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="lj-input" maxLength={300} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Slug</span>
          <input value={slug} onChange={(e) => setSlug(e.target.value)} className="lj-input" maxLength={200} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Resumo</span>
          <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className="lj-input" maxLength={500} />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Capa (URL)</span>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="lj-input" />
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'draft' | 'published')} className="lj-input">
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
          </select>
        </label>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Corpo (markdown)</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="lj-input"
            rows={18}
            style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 'var(--text-body-s)', lineHeight: 1.55 }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--danger, #B91C1C)', fontSize: 'var(--text-body-s)', marginTop: 'var(--space-3)' }}>
          {error}
        </p>
      )}
      {info && <p style={{ color: 'var(--fg-secondary)', fontSize: 'var(--text-body-s)', marginTop: 'var(--space-3)' }}>{info}</p>}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', justifyContent: 'space-between' }}>
        <button type="button" onClick={remove} disabled={saving} className="lj-btn-secondary" style={{ color: 'var(--danger, #B91C1C)' }}>
          Excluir
        </button>
        <button type="button" onClick={save} disabled={saving} className="lj-btn-primary">
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
