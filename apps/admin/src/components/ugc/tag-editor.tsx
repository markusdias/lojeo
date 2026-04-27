'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface TaggedProduct {
  productId: string;
  x: number;
  y: number;
  label?: string;
}

interface ProductLite {
  id: string;
  name: string;
  slug: string;
  status: string;
  priceCents: number;
}

interface TagEditorProps {
  postId: string;
  imageUrl: string;
  initialTags: TaggedProduct[];
  onClose: () => void;
  onSaved: (tags: TaggedProduct[]) => void;
}

const MAX_TAGS = 20;

export function TagEditor({ postId, imageUrl, initialTags, onClose, onSaved }: TagEditorProps) {
  const [tags, setTags] = useState<TaggedProduct[]>(initialTags);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [picker, setPicker] = useState<{ x: number; y: number } | null>(null);
  const [activeTagIdx, setActiveTagIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ idx: number; pointerId: number } | null>(null);

  // Load products once for autocomplete
  useEffect(() => {
    let cancel = false;
    fetch('/api/products')
      .then(r => r.json())
      .then((d: { products?: ProductLite[] }) => {
        if (cancel) return;
        setProducts(d.products ?? []);
        setLoadingProducts(false);
      })
      .catch(() => {
        if (!cancel) setLoadingProducts(false);
      });
    return () => { cancel = true; };
  }, []);

  // Dismiss with Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (picker) setPicker(null);
        else if (activeTagIdx !== null) setActiveTagIdx(null);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picker, activeTagIdx, onClose]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductLite>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? products.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q))
      : products.slice(0, 20);
    return base.slice(0, 20);
  }, [products, search]);

  function imageCoordsFromEvent(e: { clientX: number; clientY: number }): { x: number; y: number } | null {
    const img = imageRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, Number(x.toFixed(2)))),
      y: Math.max(0, Math.min(100, Number(y.toFixed(2)))),
    };
  }

  function onImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (dragRef.current) return; // ignore clicks fired right after a drag
    if (tags.length >= MAX_TAGS) {
      setError(`Limite de ${MAX_TAGS} tags por foto`);
      return;
    }
    const coords = imageCoordsFromEvent(e);
    if (!coords) return;
    setActiveTagIdx(null);
    setPicker(coords);
    setSearch('');
  }

  function addTagFromPicker(product: ProductLite) {
    if (!picker) return;
    setTags(prev => [
      ...prev,
      { productId: product.id, x: picker.x, y: picker.y, label: product.name },
    ]);
    setPicker(null);
    setSearch('');
    setError(null);
  }

  function removeTag(idx: number) {
    setTags(prev => prev.filter((_, i) => i !== idx));
    setActiveTagIdx(null);
  }

  function startDrag(idx: number, e: React.PointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { idx, pointerId: e.pointerId };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const coords = imageCoordsFromEvent(e);
    if (!coords) return;
    const { idx } = dragRef.current;
    setTags(prev => prev.map((t, i) => (i === idx ? { ...t, x: coords.x, y: coords.y } : t)));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(dragRef.current.pointerId);
    } catch {
      /* noop */
    }
    // small delay so the click handler that fires after drag is ignored
    const ref = dragRef.current;
    dragRef.current = null;
    setTimeout(() => {
      if (dragRef.current === ref) dragRef.current = null;
    }, 0);
  }

  function updateTagCoord(idx: number, axis: 'x' | 'y', value: number) {
    const v = Math.max(0, Math.min(100, value));
    setTags(prev => prev.map((t, i) => (i === idx ? { ...t, [axis]: v } : t)));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        productsTagged: tags.map(t => ({
          productId: t.productId,
          x: Number(t.x),
          y: Number(t.y),
          label: t.label,
        })),
      };
      const res = await fetch(`/api/ugc/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? 'Falha ao salvar');
        return;
      }
      onSaved(tags);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editor de tags da foto"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={onClose}
    >
      <div
        className="lj-card"
        style={{
          background: 'var(--surface)',
          maxWidth: 960, width: '100%',
          maxHeight: '92vh', overflow: 'auto',
          padding: 'var(--space-6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>
              Editar tags de produto
            </h2>
            <p className="caption">
              Clique na imagem para adicionar uma tag, arraste pins para reposicionar.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar editor"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: 20, color: 'var(--fg-secondary)', padding: 4,
            }}
          >
            ×
          </button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* Canvas */}
          <div
            style={{
              position: 'relative',
              maxWidth: 600,
              userSelect: 'none',
              touchAction: 'none',
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Foto UGC para tagueamento"
              onClick={onImageClick}
              draggable={false}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                borderRadius: 'var(--radius-md)',
                cursor: 'crosshair',
                background: 'var(--bg-subtle)',
              }}
            />

            {/* Pins */}
            {tags.map((tag, idx) => {
              const product = productById.get(tag.productId);
              const label = tag.label ?? product?.name ?? 'Produto';
              const isActive = activeTagIdx === idx;
              return (
                <div
                  key={`${tag.productId}-${idx}`}
                  style={{
                    position: 'absolute',
                    left: `${tag.x}%`,
                    top: `${tag.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <button
                    type="button"
                    aria-label={`Tag ${label} em ${tag.x.toFixed(0)}%, ${tag.y.toFixed(0)}%. Clique para opções, arraste para reposicionar.`}
                    onPointerDown={e => startDrag(idx, e)}
                    onClick={e => {
                      e.stopPropagation();
                      setActiveTagIdx(prev => (prev === idx ? null : idx));
                    }}
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'var(--accent)', color: 'var(--surface)',
                      border: '3px solid var(--surface)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      cursor: 'grab',
                      fontSize: 12, fontWeight: 'var(--w-semibold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {idx + 1}
                  </button>
                  {isActive && (
                    <div
                      role="menu"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                        padding: 'var(--space-2)',
                        minWidth: 180,
                        zIndex: 2,
                      }}
                    >
                      <p className="caption" style={{ marginBottom: 4, fontWeight: 'var(--w-semibold)' }}>
                        {label}
                      </p>
                      <p className="caption numeric" style={{ marginBottom: 8, color: 'var(--fg-secondary)' }}>
                        {tag.x.toFixed(1)}% × {tag.y.toFixed(1)}%
                      </p>
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        className="lj-btn-secondary"
                        style={{
                          width: '100%',
                          fontSize: 'var(--text-caption)',
                          color: 'var(--error)',
                          borderColor: 'var(--error)',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Picker after click on canvas */}
            {picker && (
              <div
                style={{
                  position: 'absolute',
                  left: `${picker.x}%`,
                  top: `${picker.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
                    padding: 'var(--space-3)',
                    width: 260,
                    zIndex: 3,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <p className="caption" style={{ marginBottom: 6, fontWeight: 'var(--w-semibold)' }}>
                    Buscar produto
                  </p>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nome ou slug..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      fontSize: 'var(--text-body-s)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 'var(--space-2)',
                    }}
                  />
                  <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {loadingProducts && <p className="caption">Carregando produtos...</p>}
                    {!loadingProducts && filteredProducts.length === 0 && (
                      <p className="caption">Nenhum produto encontrado.</p>
                    )}
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addTagFromPicker(p)}
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          fontSize: 'var(--text-body-s)',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          color: 'var(--fg)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {p.name}
                        <span className="caption" style={{ marginLeft: 6, color: 'var(--fg-secondary)' }}>
                          /{p.slug}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPicker(null)}
                    style={{
                      marginTop: 'var(--space-2)',
                      background: 'transparent', border: 'none',
                      color: 'var(--fg-secondary)', fontSize: 'var(--text-caption)',
                      cursor: 'pointer', padding: 0,
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — kbd-friendly fallback */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div>
              <p className="caption" style={{ fontWeight: 'var(--w-semibold)', marginBottom: 4 }}>
                Tags ({tags.length}/{MAX_TAGS})
              </p>
              <p className="caption" style={{ color: 'var(--fg-secondary)' }}>
                Use a lista abaixo para ajustar posições com teclado.
              </p>
            </div>

            <button
              type="button"
              className="lj-btn-secondary"
              onClick={() => {
                if (tags.length >= MAX_TAGS) {
                  setError(`Limite de ${MAX_TAGS} tags por foto`);
                  return;
                }
                setActiveTagIdx(null);
                setPicker({ x: 50, y: 50 });
                setSearch('');
              }}
              style={{ fontSize: 'var(--text-caption)' }}
            >
              + Adicionar tag (centro)
            </button>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: 320, overflowY: 'auto' }}>
              {tags.length === 0 && <p className="caption">Nenhuma tag ainda.</p>}
              {tags.map((tag, idx) => {
                const product = productById.get(tag.productId);
                const label = tag.label ?? product?.name ?? 'Produto';
                return (
                  <div
                    key={`${tag.productId}-${idx}-row`}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
                      <span className="caption" style={{ fontWeight: 'var(--w-semibold)' }}>
                        #{idx + 1} {label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTag(idx)}
                        aria-label={`Remover tag ${label}`}
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--error)', cursor: 'pointer',
                          fontSize: 'var(--text-caption)',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-caption)' }}>
                      X
                      <input
                        type="range" min={0} max={100} step={0.5}
                        value={tag.x}
                        onChange={e => updateTagCoord(idx, 'x', Number(e.target.value))}
                        style={{ flex: 1 }}
                        aria-label={`Posição X da tag ${label}`}
                      />
                      <span className="numeric" style={{ width: 36, textAlign: 'right' }}>{tag.x.toFixed(0)}%</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-caption)', marginTop: 4 }}>
                      Y
                      <input
                        type="range" min={0} max={100} step={0.5}
                        value={tag.y}
                        onChange={e => updateTagCoord(idx, 'y', Number(e.target.value))}
                        style={{ flex: 1 }}
                        aria-label={`Posição Y da tag ${label}`}
                      />
                      <span className="numeric" style={{ width: 36, textAlign: 'right' }}>{tag.y.toFixed(0)}%</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {error && (
          <p className="caption" style={{ color: 'var(--error)', marginTop: 'var(--space-3)' }}>
            {error}
          </p>
        )}

        <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-5)' }}>
          <button
            type="button"
            onClick={onClose}
            className="lj-btn-secondary"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            className="lj-btn-primary"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar tags'}
          </button>
        </footer>
      </div>
    </div>
  );
}
