'use client';

import { useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (url: string) => void;
}

interface UploadResponse {
  ok?: boolean;
  url?: string;
  error?: string;
  retryAfterSec?: number;
  maxBytes?: number;
}

const ACCEPT = 'image/jpeg,image/png,image/webp';

export function CoverUpload({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens (jpg, png, webp).');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/blog/cover-upload', { method: 'POST', body: fd });
      const data = (await res.json()) as UploadResponse;
      if (!res.ok || !data.ok || !data.url) {
        if (res.status === 429) setError(`Aguarde ${data.retryAfterSec ?? 60}s para enviar de novo`);
        else if (res.status === 400 && data.error === 'file_too_large') {
          const mb = Math.round((data.maxBytes ?? 0) / 1024 / 1024);
          setError(`Imagem muito grande (máx ${mb} MB). Otimize antes de enviar.`);
        } else if (data.error === 'invalid_image_signature') {
          setError('Arquivo não é uma imagem válida.');
        } else if (data.error === 'image_processing_failed') {
          setError('Falha ao processar a imagem. Tente outra.');
        } else {
          setError(data.error ?? 'Falha ao enviar.');
        }
        return;
      }
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <span style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-secondary)' }}>Capa</span>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: value ? '180px 1fr' : '1fr',
          gap: 'var(--space-3)',
          alignItems: 'center',
        }}
      >
        {value && (
          <img
            src={value}
            alt="Pré-visualização da capa"
            width={180}
            height={120}
            style={{ width: 180, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--border)' }}
          />
        )}
        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="lj-btn-secondary"
            >
              {uploading ? 'Enviando…' : value ? 'Trocar imagem' : 'Enviar imagem'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                disabled={uploading}
                className="lj-btn-secondary"
                style={{ color: 'var(--danger, #B91C1C)' }}
              >
                Remover
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = '';
            }}
          />
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ou cole uma URL: https://…"
            className="lj-input"
            style={{ fontSize: 'var(--text-body-s)' }}
          />
        </div>
      </div>
      {error && <p role="alert" style={{ color: 'var(--danger, #B91C1C)', fontSize: 'var(--text-body-s)', margin: 0 }}>{error}</p>}
    </div>
  );
}
