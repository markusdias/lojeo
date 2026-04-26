import Link from 'next/link';
import { db, products } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import { getActiveTemplate } from '../template';
import { ProductCard } from '../components/ui/product-card';
import { PersonalizedHero } from '../components/marketing/personalized-hero';
import { RecommendedForYouSection } from '../components/products/recommended-for-you';
import { AnonAffinitySection } from '../components/products/anon-affinity-section';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const SECTIONS = [
  { slug: 'aneis',    label: 'Anéis',     blurb: 'Solitários, eternidades e bandas.' },
  { slug: 'brincos',  label: 'Brincos',   blurb: 'Argolas, ear cuffs, gotas.' },
  { slug: 'colares',  label: 'Colares',   blurb: 'Pingentes e correntes finas.' },
];

// SVG icons match docs/design-system-jewelry-v1/project/preview/trust-signals.html
const TrustIcon = ({ d }: { d: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
);
const TRUST_ITEMS: { icon: React.ReactNode; label: string; desc: string }[] = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Garantia 1 ano',
    desc: 'contra defeitos de fabricação',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 7h13l5 5v5h-3" />
        <path d="M14 17H8" />
        <circle cx="6" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    label: 'Frete grátis',
    desc: 'acima de R$ 500',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      </svg>
    ),
    label: 'Embalagem presente',
    desc: 'inclusa em todo pedido',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    label: 'Trocas em 30 dias',
    desc: 'sem perguntas',
  },
];
void TrustIcon;

export default async function HomePage() {
  const tid = tenantId();
  const tpl = await getActiveTemplate();

  const [newArrivals] = await Promise.all([
    db.select().from(products)
      .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt))
      .limit(4),
  ]);

  return (
    <>
      {/* ── HERO ── */}
      <section style={{ maxWidth: 'var(--container-max)', margin: '24px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{
          position: 'relative', borderRadius: 8, overflow: 'hidden',
          aspectRatio: '16/9',
          background: 'linear-gradient(135deg, #E8DDC9 0%, #D4C5A8 100%)',
          minHeight: 420,
        }}>
          {/* Overlay gradient */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(232,221,201,0.92) 0%, rgba(232,221,201,0.4) 50%, rgba(232,221,201,0) 70%)',
          }} />
          {/* Content — A/B test homepage-hero (defaults preservados como fallback quando inativo) */}
          <div style={{
            position: 'absolute', left: 'clamp(24px, 5vw, 80px)',
            top: '50%', transform: 'translateY(-50%)',
          }}>
            <PersonalizedHero
              defaultHeadline="Peças que ficam."
              defaultSubheadline="Joalheria contemporânea, finalizada à mão no nosso ateliê. Ouro 18k e prata 925 com garantia de um ano."
              defaultCta={{ label: 'Ver coleção', href: '/produtos' }}
            />
          </div>
        </div>
      </section>

      {/* ── CATEGORIAS ── */}
      <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{ marginBottom: 48 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Coleções</p>
          <h2 style={{ margin: 0 }}>Por categoria</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {SECTIONS.map(c => (
            <Link key={c.slug} href={`/produtos?categoria=${c.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div style={{
                aspectRatio: '3/4',
                background: 'var(--surface-sunken)',
                borderRadius: 'var(--r-image)',
                overflow: 'hidden', marginBottom: 18,
                display: 'grid', placeItems: 'center',
              }}>
                <div style={{
                  width: '60%', height: '60%',
                  background: 'linear-gradient(135deg, #D4C5A8 0%, #B8956A22 100%)',
                  borderRadius: '50%',
                }} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 24 }}>{c.label}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── PARA VOCÊ (cliente logado recorrente, server) ── */}
      <RecommendedForYouSection currency={tpl.currency} />

      {/* ── CONTINUE EXPLORANDO (anônimo recorrente, client por anonymousId) ── */}
      <AnonAffinitySection currency={tpl.currency} />

      {/* ── NOVIDADES ── */}
      {newArrivals.length > 0 && (
        <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48 }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Acabou de chegar</p>
              <h2 style={{ margin: 0 }}>Recém-criadas</h2>
            </div>
            <Link href="/produtos?ordenar=novidades" style={{ fontSize: 14, borderBottom: '1px solid var(--text-primary)', paddingBottom: 2, color: 'var(--text-primary)' }}>
              ver todas
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {newArrivals.map(p => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                priceCents={p.priceCents}
                comparePriceCents={p.comparePriceCents}
                currency={tpl.currency}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── SOBRE BREVE ── */}
      <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{
            aspectRatio: '4/5',
            background: 'linear-gradient(135deg, #F4F1E9 0%, #E8DFC9 100%)',
            borderRadius: 8,
          }} />
          <div>
            <p className="eyebrow" style={{ marginBottom: 16 }}>Nossa história</p>
            <h2 style={{ margin: '0 0 24px', lineHeight: 1.1 }}>
              Cada peça começa<br />numa pequena bancada.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
              Trabalhamos com ourives independentes em São Paulo. Ouro 18k certificado, diamantes rastreáveis, e a sua história gravada à mão se você quiser.
            </p>
            <Link href="/sobre" style={{
              fontSize: 14, borderBottom: '1px solid var(--text-primary)',
              paddingBottom: 2, color: 'var(--text-primary)',
            }}>
              Conheça o ateliê →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32,
          borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)',
          padding: '40px 0',
        }}>
          {TRUST_ITEMS.map(t => (
            <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6 }}>
              <span style={{ width: 32, height: 32, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                {t.icon}
              </span>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.3, margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
