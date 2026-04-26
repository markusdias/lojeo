'use client';

import { useEffect, useState, useRef, useId } from 'react';

interface UgcPost {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  approvedAt: string | null;
}

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Em análise', color: '#92400E', bg: '#FFF7ED' },
  moderating: { label: 'Moderando', color: '#92400E', bg: '#FFF7ED' },
  approved:   { label: 'Aprovado',   color: '#166534', bg: '#F0FDF4' },
  rejected:   { label: 'Rejeitado',  color: '#991B1B', bg: '#FEF2F2' },
};

export default function GaleriaPage() {
  const [posts, setPosts] = useState<UgcPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const captionId = useId();

  function load() {
    setLoading(true);
    fetch('/api/ugc')
      .then(r => r.json())
      .then((d: { posts: UgcPost[] }) => { setPosts(d.posts ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert('Selecione uma foto');
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    if (caption) fd.append('caption', caption);
    try {
      const res = await fetch('/api/ugc', { method: 'POST', body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        alert(`Erro: ${data.error ?? res.status}`);
        return;
      }
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Minhas fotos</h1>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
        Compartilhe a sua peça em uso. Suas fotos podem aparecer na galeria da loja após aprovação.
      </p>

      {/* Upload form */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: 8, padding: 20, marginBottom: 32 }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Enviar nova foto</p>
        <label htmlFor={fileId} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          Foto da peça
        </label>
        <input
          id={fileId}
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required
          style={{ display: 'block', marginBottom: 12, fontSize: 13 }}
        />
        <label htmlFor={captionId} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
          Legenda (opcional)
        </label>
        <textarea
          id={captionId}
          placeholder="Conte um pouco sobre a peça (opcional)"
          value={caption}
          onChange={e => setCaption(e.target.value)}
          maxLength={500}
          rows={2}
          style={{ width: '100%', border: '1px solid var(--divider)', borderRadius: 4, padding: 8, fontSize: 13, marginBottom: 12, resize: 'vertical' }}
        />
        <button
          type="submit"
          disabled={uploading}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? 'Enviando...' : 'Enviar foto'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Máx 8MB. JPG, PNG ou WebP. Sua foto será analisada antes de ir ao ar.
        </p>
      </form>

      {/* Lista */}
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Carregando...</p>
      ) : posts.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma foto enviada ainda.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {posts.map(p => {
            const s = STATUS[p.status] ?? STATUS['pending']!;
            return (
              <div key={p.id} style={{ border: '1px solid var(--divider)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ aspectRatio: '1', background: '#f3f4f6', position: 'relative' }}>
                  <img
                    src={p.thumbnailUrl ?? p.imageUrl}
                    alt={p.caption ?? 'Foto enviada pelo cliente'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <span style={{ position: 'absolute', top: 8, right: 8, background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                    {s.label}
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  {p.caption && (
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>
                      {p.caption}
                    </p>
                  )}
                  {p.status === 'rejected' && p.rejectionReason && (
                    <p style={{ fontSize: 11, color: '#991B1B', marginTop: 4 }}>
                      Motivo: {p.rejectionReason}
                    </p>
                  )}
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
