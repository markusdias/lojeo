import Link from 'next/link';
import { db, products, collections } from '@lojeo/db';
import { eq, and, desc } from 'drizzle-orm';
import { getActiveTemplate } from '../template';
import { ProductCard } from '../components/ui/product-card';
import { PersonalizedHero } from '../components/marketing/personalized-hero';
import { RecommendedForYouSection } from '../components/products/recommended-for-you';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const SECTIONS = [
  { slug: 'aneis',    label: 'Anéis',     blurb: 'Solitários, eternidades e bandas.' },
  { slug: 'brincos',  label: 'Brincos',   blurb: 'Argolas, ear cuffs, gotas.' },
  { slug: 'colares',  label: 'Colares',   blurb: 'Pingentes e correntes finas.' },
];

const TRUST_ITEMS = [
  { icon: '✦', label: 'Ouro 18k certificado' },
  { icon: '◈', label: 'Frete grátis acima de R$ 500' },
  { icon: '◉', label: 'Garantia de 1 ano' },
  { icon: '⬡', label: 'Devolução em 30 dias' },
];

export default async function HomePage() {
  const tid = tenantId();
  const tpl = await getActiveTemplate();

  const [newArrivals] = await Promise.all([
    db.select().from(products)
      .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt))
      .limit(4),
  ]);

  const formatPrice = (cents: number) =>
    (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: tpl.currency });

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

      {/* ── PARA VOCÊ (cliente recorrente, server) ── */}
      <RecommendedForYouSection currency={tpl.currency} />

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
            <div key={t.label} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 24, color: 'var(--accent)', display: 'block', marginBottom: 12 }}>{t.icon}</span>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{t.label}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
