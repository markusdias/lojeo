'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '../ui/icon';
import { useCart } from '../cart/cart-provider';
import { useWishlist } from '../wishlist/wishlist-provider';

const CATEGORIES = [
  { slug: 'aneis',    label: 'Anéis' },
  { slug: 'brincos',  label: 'Brincos' },
  { slug: 'colares',  label: 'Colares' },
  { slug: 'pulseiras', label: 'Pulseiras' },
];

const iconBtn: React.CSSProperties = {
  position: 'relative',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  padding: 6,
  display: 'grid',
  placeItems: 'center',
};

function Pip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      position: 'absolute', top: -2, right: -4,
      background: 'var(--pip-bg, var(--text-primary, #1A1612))', color: '#fff',
      fontSize: 10, fontWeight: 600, height: 16, minWidth: 16,
      borderRadius: 999, padding: '0 4px',
      display: 'grid', placeItems: 'center',
    }}>
      {children}
    </span>
  );
}

export function Header({ storeName, isAuthenticated = false }: { storeName: string; isAuthenticated?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/busca?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery('');
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: scrolled ? 'rgba(250,250,246,0.82)' : 'var(--bg)',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--divider)' : '1px solid transparent',
      transition: 'all 200ms var(--ease-out)',
    }}>
      <div style={{
        maxWidth: 'var(--container-max)', margin: '0 auto',
        padding: '0 var(--container-pad)',
        height: 80,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: 24,
      }}>
        {/* Nav esquerda — desktop */}
        <nav aria-label="Categorias principais" style={{ display: 'flex', gap: 28, fontSize: 13 }}>
          {CATEGORIES.map(c => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              style={{ color: 'var(--text-primary)', transition: 'color 120ms' }}
            >
              {c.label}
            </Link>
          ))}
          <Link href="/colecoes" style={{ color: 'var(--text-secondary)' }}>Coleções</Link>
          <Link href="/blog" style={{ color: 'var(--text-secondary)' }}>Blog</Link>
          <Link href="/gift-cards" style={{ color: 'var(--text-secondary)' }}>Presente</Link>
        </nav>

        {/* Logo centro */}
        <Link href="/" style={{ display: 'block' }} aria-label={`${storeName} — voltar para a home`}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
          }}>
            {storeName}
          </span>
        </Link>

        {/* Ações direita */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 4,
          alignItems: 'center',
          position: 'relative',
        }}>
          <button
            type="button"
            style={iconBtn}
            onClick={() => setSearchOpen(o => !o)}
            aria-label="Buscar produtos"
            aria-expanded={searchOpen}
          >
            <Icon name="search" size={20} />
          </button>

          {/* Menu conta */}
          <div style={{ position: 'relative' }}>
            <button
              style={iconBtn}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Minha conta"
            >
              <Icon name="user" size={20} />
            </button>
            {menuOpen && (
              <div
                onMouseLeave={() => setMenuOpen(false)}
                style={{
                  position: 'absolute', top: 44, right: 0,
                  background: 'var(--surface)', border: '1px solid var(--divider)',
                  borderRadius: 6, padding: 8, minWidth: 180,
                  boxShadow: 'var(--shadow-lg)', zIndex: 60,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {[
                  ...(isAuthenticated
                    ? [
                        { label: 'Minha conta', href: '/conta' },
                        { label: 'Pedidos', href: '/conta/pedidos' },
                        { label: 'Wishlist', href: '/wishlist' },
                        null,
                        { label: 'Sair', href: '/api/auth/signout' },
                      ]
                    : [
                        { label: 'Entrar', href: '/entrar' },
                        { label: 'Criar conta', href: '/entrar?mode=register' },
                      ]),
                  null,
                  { label: 'Sobre a marca', href: '/sobre' },
                  { label: 'Trocas e devoluções', href: '/trocas' },
                ].map((item, i) =>
                  item === null
                    ? <div key={i} style={{ height: 1, background: 'var(--divider)', margin: '6px 4px' }} />
                    : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          padding: '8px 12px', fontSize: 13,
                          color: 'var(--text-primary)', borderRadius: 4,
                          display: 'block',
                        }}
                      >
                        {item.label}
                      </Link>
                    )
                )}
              </div>
            )}
          </div>

          {/* Wishlist */}
          <Link href="/wishlist" style={iconBtn} aria-label="Lista de desejos">
            <Icon name="heart" size={20} />
            {wishCount > 0 && <Pip>{wishCount}</Pip>}
          </Link>

          {/* Carrinho */}
          <Link href="/carrinho" style={iconBtn} aria-label="Sacola">
            <Icon name="bag" size={20} />
            {count > 0 && <Pip>{count}</Pip>}
          </Link>

          {/* Mobile menu toggle */}
          <button
            style={{ ...iconBtn, display: 'none' }}
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Menu"
          >
            <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div
          style={{
            borderTop: '1px solid var(--divider)',
            background: 'var(--bg)',
            padding: '20px var(--container-pad)',
          }}
        >
          <form
            onSubmit={submitSearch}
            style={{
              maxWidth: 'var(--container-max)',
              margin: '0 auto',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <Icon name="search" size={20} />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar anéis, brincos, colares..."
              aria-label="Buscar produtos"
              style={{
                flex: 1,
                padding: '10px 4px',
                fontSize: 16,
                fontFamily: 'var(--font-body)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--divider)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
              style={{ ...iconBtn, color: 'var(--text-secondary)' }}
              aria-label="Fechar busca"
            >
              <Icon name="close" size={20} />
            </button>
          </form>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <nav aria-label="Categorias (mobile)" style={{
          borderTop: '1px solid var(--divider)',
          background: 'var(--bg)',
          padding: '16px var(--container-pad) 24px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {CATEGORIES.map(c => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              onClick={() => setMobileOpen(false)}
              style={{ padding: '10px 0', fontSize: 16, color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/colecoes"
            onClick={() => setMobileOpen(false)}
            style={{ padding: '10px 0', fontSize: 16, color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}
          >
            Coleções
          </Link>
          <Link
            href="/blog"
            onClick={() => setMobileOpen(false)}
            style={{ padding: '10px 0', fontSize: 16, color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}
          >
            Blog
          </Link>
          <Link
            href="/gift-cards"
            onClick={() => setMobileOpen(false)}
            style={{ padding: '10px 0', fontSize: 16, color: 'var(--text-primary)', borderBottom: '1px solid var(--divider)' }}
          >
            Vale-presente
          </Link>
        </nav>
      )}
    </header>
  );
}
