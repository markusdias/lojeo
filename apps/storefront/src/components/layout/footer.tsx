import Link from 'next/link';
import { NewsletterForm } from './newsletter-form';
import { ManageCookiesButton } from '../marketing/manage-cookies-button';

export function Footer({ storeName, tagline }: { storeName: string; tagline?: string }) {
  return (
    <footer style={{
      background: 'var(--footer-bg)',
      color: 'var(--footer-text)',
      marginTop: 120,
    }}>
      <div style={{
        maxWidth: 'var(--container-max)', margin: '0 auto',
        padding: '80px var(--container-pad) 48px',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 40,
      }}>
        {/* Marca */}
        <div style={{ gridColumn: 'span 1' }}>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em',
            marginBottom: 16, color: 'var(--footer-text)',
          }}>
            {storeName}
          </p>
          <p style={{ fontSize: 13, color: 'var(--footer-muted)', lineHeight: 1.6, maxWidth: '28ch', margin: 0 }}>
            {tagline || 'Joalheria contemporânea em ouro 18k e prata 925, com garantia de um ano.'}
          </p>
        </div>

        {/* Loja */}
        <div>
          <p className="eyebrow" style={{ color: 'var(--footer-muted)', marginBottom: 20 }}>Loja</p>
          {[
            { label: 'Anéis', href: '/produtos?categoria=aneis' },
            { label: 'Brincos', href: '/produtos?categoria=brincos' },
            { label: 'Colares', href: '/produtos?categoria=colares' },
            { label: 'Pulseiras', href: '/produtos?categoria=pulseiras' },
            { label: 'Coleções', href: '/colecoes' },
            { label: 'Novidades', href: '/produtos?ordenar=novidades' },
            { label: 'Gift cards', href: '/gift-cards' },
            { label: 'Comunidade', href: '/comunidade' },
            { label: 'Blog', href: '/blog' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{
              display: 'block', fontSize: 13, color: 'var(--footer-muted)',
              marginBottom: 12, transition: 'color 120ms',
            }}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Ajuda */}
        <div>
          <p className="eyebrow" style={{ color: 'var(--footer-muted)', marginBottom: 20 }}>Ajuda</p>
          {[
            { label: 'Rastrear pedido', href: '/rastreio' },
            { label: 'Trocas e devoluções', href: '/trocas' },
            { label: 'Política de privacidade', href: '/privacidade' },
            { label: 'Termos de uso', href: '/termos' },
            { label: 'Sobre a marca', href: '/sobre' },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{
              display: 'block', fontSize: 13, color: 'var(--footer-muted)',
              marginBottom: 12, transition: 'color 120ms',
            }}>
              {l.label}
            </Link>
          ))}
          <ManageCookiesButton variant="footer" />
        </div>

        {/* Newsletter stub */}
        <div>
          <p className="eyebrow" style={{ color: 'var(--footer-muted)', marginBottom: 20 }}>Newsletter</p>
          <p style={{ fontSize: 13, color: 'var(--footer-muted)', lineHeight: 1.6, margin: '0 0 16px', maxWidth: '28ch' }}>
            Novas peças, promoções e histórias do ateliê.
          </p>
          <NewsletterForm />
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '24px var(--container-pad)',
        maxWidth: 'var(--container-max)', margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 12, color: 'var(--footer-muted)',
      }}>
        <span>© {new Date().getFullYear()} {storeName}. Todos os direitos reservados.</span>
        <span>Motor Lojeo · jewelry-v1</span>
      </div>
    </footer>
  );
}
