'use client';

import { useState } from 'react';
import { ImageUpload, type UploadedPayload } from '@/components/products/image-upload';

interface GalleryImage {
  id: string;
  url: string;
  altText: string | null;
  position: number;
}

interface Props {
  productId: string;
  initialImages: GalleryImage[];
  removeBgEnabled: boolean;
}

export function ImagesGallery({ productId, initialImages, removeBgEnabled }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleUploaded(payload: UploadedPayload) {
    const next: GalleryImage[] = [];
    const maxPos = images.reduce((m, i) => Math.max(m, i.position), -1);
    if (payload.image) {
      next.push({ id: payload.image.id, url: payload.image.url, altText: payload.image.altText, position: maxPos + 1 });
    }
    if (payload.nobgImage) {
      next.push({ id: payload.nobgImage.id, url: payload.nobgImage.url, altText: payload.nobgImage.altText, position: maxPos + 2 });
    }
    if (next.length > 0) setImages((prev) => [...prev, ...next]);
  }

  async function handleDelete(imageId: string) {
    setBusy(imageId);
    try {
      await fetch(`/api/products/${productId}/images/${imageId}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } finally {
      setBusy(null);
    }
  }

  async function swapPositions(idxA: number, idxB: number) {
    const a = images[idxA];
    const b = images[idxB];
    if (!a || !b) return;

    const newImages = images.map((img, i) => {
      if (i === idxA) return { ...img, position: b.position };
      if (i === idxB) return { ...img, position: a.position };
      return img;
    });
    setImages(newImages);

    await Promise.all([
      fetch(`/api/products/${productId}/images/${a.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: b.position }),
      }),
      fetch(`/api/products/${productId}/images/${b.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: a.position }),
      }),
    ]);
  }

  const sorted = [...images].sort((a, b) => a.position - b.position);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {sorted.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          {sorted.map((img, idx) => (
            <div key={img.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <div style={{
                aspectRatio: '1',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--bg-subtle, #f5f0e8)',
                border: '1px solid var(--border)',
              }}>
                <img
                  src={img.url}
                  alt={img.altText ?? 'Imagem do produto'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => swapPositions(idx, idx - 1)}
                  disabled={idx === 0 || busy === img.id}
                  className="lj-btn-secondary"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  title="Mover para esquerda"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => swapPositions(idx, idx + 1)}
                  disabled={idx === sorted.length - 1 || busy === img.id}
                  className="lj-btn-secondary"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  title="Mover para direita"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  disabled={busy === img.id}
                  className="lj-btn-danger"
                  style={{ padding: '2px 8px', fontSize: 12 }}
                  title="Remover imagem"
                >
                  {busy === img.id ? '…' : '×'}
                </button>
              </div>
              {img.altText?.startsWith('[nobg]') && (
                <span className="lj-badge lj-badge-accent" style={{ alignSelf: 'center', fontSize: 10 }}>Sem fundo</span>
              )}
            </div>
          ))}
        </div>
      )}
      <ImageUpload
        productId={productId}
        removeBgEnabled={removeBgEnabled}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
