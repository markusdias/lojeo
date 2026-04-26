'use client';

import Link from 'next/link';
import { useWishlist } from '../../components/wishlist/wishlist-provider';
import { HeartButton } from '../../components/wishlist/heart-button';
import { useCart } from '../../components/cart/cart-provider';

function fmt(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function WishlistPage() {
  const { items } = useWishlist();
  const { addItem } = useCart();

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', padding: '80px 16px' }}>
        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} style={{ margin: '0 auto 24px', display: 'block' }}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Lista de desejos</p>
        <h1 style={{ marginBottom: 16 }}>Nenhuma peça salva</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>
          Clique no coração de qualquer produto para salvá-lo aqui.
        </p>
        <Link
          href="/produtos"
          style={{
            display: 'inline-block', padding: '14px 32px',
            background: 'var(--text-primary)', color: 'var(--text-on-dark)',
            fontSize: 14, fontWeight: 500, borderRadius: 8,
          }}
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
      <p className="eyebrow" style={{ marginBottom: 8 }}>Lista de desejos</p>
      <h1 style={{ marginBottom: 40 }}>{items.length} {items.length === 1 ? 'peça salva' : 'peças salvas'}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 32 }}>
        {items.map(item => (
          <div key={item.productId} style={{ position: 'relative' }}>
            <Link href={`/produtos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                aspectRatio: '3/4', background: 'var(--surface-sunken)',
                borderRadius: 8, overflow: 'hidden', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>◆</span>
                )}
              </div>
              <p style={{ fontSize: 14, marginBottom: 4 }}>{item.name}</p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{fmt(item.priceCents)}</p>
            </Link>

            {/* Heart remove button */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <HeartButton
                productId={item.productId}
                slug={item.slug}
                name={item.name}
                priceCents={item.priceCents}
                imageUrl={item.imageUrl}
                size={22}
                style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 6 }}
              />
            </div>

            <button
              onClick={() => addItem({ id: item.productId, productId: item.productId, slug: item.slug, name: item.name, priceCents: item.priceCents, qty: 1, imageUrl: item.imageUrl ?? undefined })}
              style={{
                width: '100%', marginTop: 8, padding: '10px 0',
                background: 'var(--text-primary)', color: 'var(--text-on-dark)',
                border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Adicionar ao carrinho
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
