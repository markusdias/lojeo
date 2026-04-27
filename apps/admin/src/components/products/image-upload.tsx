'use client';

import { useState } from 'react';

/**
 * Componente client para upload de imagens de produto com toggle opcional
 * "Gerar versão sem fundo" (Remove.bg).
 *
 * O toggle só fica visível quando `removeBgEnabled=true` (passado pelo server
 * lendo `process.env.REMOVE_BG_KEY`). Modo degradado: se a flag estiver off,
 * o checkbox simplesmente não aparece — sem mensagem de erro.
 *
 * Após upload bem-sucedido, chama `onUploaded({ image, thumbnails, nobgImage,
 * nobgThumbnails, nobgError })` para o parent atualizar a galeria. Falhas no
 * Remove.bg NÃO bloqueiam — a imagem original é sempre salva.
 */

export interface UploadedPayload {
  image: { id: string; url: string; altText: string | null } | null;
  thumbnails: Record<string, string>;
  nobgImage?: { id: string; url: string; altText: string | null } | null;
  nobgThumbnails?: Record<string, string> | null;
  nobgError?: string | null;
}

export interface ImageUploadProps {
  productId: string;
  /** Se true, exibe checkbox "Gerar versão sem fundo". Vem do server. */
  removeBgEnabled?: boolean;
  onUploaded?: (payload: UploadedPayload) => void;
}

export function ImageUpload({ productId, removeBgEnabled = false, onUploaded }: ImageUploadProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeBg, setRemoveBg] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      if (removeBgEnabled && removeBg) form.append('removeBg', 'true');
      const res = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        body: form,
      });
      const json = (await res.json()) as UploadedPayload & { error?: string };
      if (!res.ok) {
        setError(json.error ?? 'Falha no upload');
        return;
      }
      onUploaded?.(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha de rede');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          border: '1px dashed var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
        <span style={{ fontSize: 'var(--text-body)' }}>
          {busy ? 'Enviando…' : 'Adicionar imagem'}
        </span>
      </label>

      {removeBgEnabled ? (
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-caption)',
            color: 'var(--fg-secondary)',
          }}
        >
          <input
            type="checkbox"
            checked={removeBg}
            onChange={(e) => setRemoveBg(e.target.checked)}
            disabled={busy}
          />
          Gerar também versão sem fundo (Remove.bg)
        </label>
      ) : (
        <span
          title="Configure REMOVE_BG_KEY em variáveis de ambiente para habilitar remoção de fundo automática"
          aria-label="Configure REMOVE_BG_KEY em variáveis de ambiente para habilitar remoção de fundo automática"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--text-caption)',
            color: 'var(--fg-muted, var(--fg-secondary))',
            cursor: 'help',
          }}
        >
          <span aria-hidden style={{ opacity: 0.6 }}>⊘</span>
          Remoção de fundo desabilitada
        </span>
      )}

      {error && (
        <p
          role="alert"
          style={{ fontSize: 'var(--text-caption)', color: 'var(--fg-error, #b00020)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
