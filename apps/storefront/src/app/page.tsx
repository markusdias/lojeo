import Link from 'next/link';
import { db, products, productReviews } from '@lojeo/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getActiveTemplate } from '../template';
import { ProductCard } from '../components/ui/product-card';
import { PersonalizedHero } from '../components/marketing/personalized-hero';
import { StaticHero } from '../components/marketing/static-hero';
import {
  HomePersonalizationProvider,
  HomeVariantGate,
} from '../components/marketing/home-personalization-gate';
import { RecommendedForYouSection } from '../components/products/recommended-for-you';
import { ContinueWhereLeftOffSection } from '../components/products/continue-where-left-off';
import { AnonAffinitySection } from '../components/products/anon-affinity-section';
import { UgcGallery } from '../components/ugc/ugc-gallery';
import { HeroVariant } from '../components/marketing/hero-variant';
import { HomepageReviews } from '../components/marketing/homepage-reviews';
import { HomepageBlog } from '../components/marketing/homepage-blog';
import {
  getTenantRuntimeConfig,
  resolveHomepageSections,
  DEFAULT_TRUST_SIGNALS,
} from '../lib/tenant-config';

export const dynamic = 'force-dynamic';

const tenantId = () => process.env.TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

const SECTIONS = [
  { slug: 'aneis',     label: 'Anéis',     blurb: 'Solitários, eternidades e bandas.' },
  { slug: 'brincos',   label: 'Brincos',   blurb: 'Argolas, ear cuffs, gotas.'         },
  { slug: 'colares',   label: 'Colares',   blurb: 'Pingentes e correntes finas.'       },
  { slug: 'pulseiras', label: 'Pulseiras', blurb: 'Riviera, elos e pingentes.'         },
];

function buildTrustRegistry(rating: { avg: number | null; count: number }): Record<string, { icon: React.ReactNode; label: string; desc: string }> {
  const hasReal = rating.avg !== null && rating.count > 0;
  const ratingLabel = hasReal ? `Avaliação ${rating.avg!.toFixed(1)}★` : 'Avaliação 4.8★';
  const ratingDesc = hasReal
    ? `${rating.count.toLocaleString('pt-BR')} ${rating.count === 1 ? 'cliente' : 'clientes'}`
    : 'mais de 1.200 clientes';
  return ({
  warranty: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Garantia 12 meses',
    desc: 'contra defeitos de fabricação',
  },
  shipping: {
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
  returns: {
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
  payment: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="6" width="20" height="13" rx="2" />
        <path d="M2 11h20" />
      </svg>
    ),
    label: 'Pix, cartão até 12×',
    desc: 'sem juros nas primeiras parcelas',
  },
  secure: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 1 1 8 0v4" />
      </svg>
    ),
    label: 'Site seguro',
    desc: 'SSL e checkout criptografado',
  },
  rating: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
      </svg>
    ),
    label: ratingLabel,
    desc: ratingDesc,
  },
  });
}

export default async function HomePage() {
  const tid = tenantId();
  const tpl = await getActiveTemplate();
  const { appearance } = await getTenantRuntimeConfig();

  const [newArrivals, ratingAgg] = await Promise.all([
    db.select().from(products)
      .where(and(eq(products.tenantId, tid), eq(products.status, 'active')))
      .orderBy(desc(products.createdAt))
      .limit(4),
    db.select({
      avg: sql<string>`avg(${productReviews.rating})`,
      count: sql<string>`count(*)`,
    })
      .from(productReviews)
      .where(and(eq(productReviews.tenantId, tid), eq(productReviews.status, 'approved')))
      .then(rows => rows[0] ?? { avg: null, count: '0' })
      .catch(() => ({ avg: null, count: '0' })),
  ]);
  const avgRating = ratingAgg.avg ? Number(ratingAgg.avg) : null;
  const ratingCount = Number(ratingAgg.count ?? 0);

  const slogan = appearance.slogan?.trim() || 'Peças que ficam.';
  const tagline = appearance.tagline?.trim()
    || 'Joalheria contemporânea, finalizada à mão no nosso ateliê. Ouro 18k e prata 925 com garantia de um ano.';
  // hero=video/carousel ainda não tem flow de upload (UI marca "em breve").
  // Storefront cai em image como fallback robusto até flows existirem.
  const rawHero = appearance.hero ?? 'image';
  const heroVariant: 'image' | 'grid' = rawHero === 'grid' ? 'grid' : 'image';
  const trustIds = (appearance.trustSignals && appearance.trustSignals.length > 0)
    ? appearance.trustSignals
    : DEFAULT_TRUST_SIGNALS;
  const trustRegistry = buildTrustRegistry({ avg: avgRating, count: ratingCount });
  const trustItems = trustIds.map(id => trustRegistry[id]).filter(Boolean) as Array<typeof trustRegistry[string]>;
  const sections = resolveHomepageSections(appearance).filter(s => !s.off);

  const HERO_DEFAULTS = {
    headline: slogan,
    subheadline: tagline,
    cta: { label: 'Ver coleção', href: '/produtos' },
  };

  const blocks: Record<string, React.ReactNode> = {
    hero: (
      <section key="hero" style={{ maxWidth: 'var(--container-max)', margin: '24px auto 0', padding: '0 var(--container-pad)' }}>
        <HeroVariant variant={heroVariant}>
          <HomeVariantGate variant="control">
            <StaticHero
              headline={HERO_DEFAULTS.headline}
              subheadline={HERO_DEFAULTS.subheadline}
              cta={HERO_DEFAULTS.cta}
            />
          </HomeVariantGate>
          <HomeVariantGate variant="personalized">
            <PersonalizedHero
              defaultHeadline={HERO_DEFAULTS.headline}
              defaultSubheadline={HERO_DEFAULTS.subheadline}
              defaultCta={HERO_DEFAULTS.cta}
            />
          </HomeVariantGate>
        </HeroVariant>
      </section>
    ),
    collections: (
      <section key="collections" style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{ marginBottom: 48 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Coleções</p>
          <h2 style={{ margin: 0 }}>Por categoria</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
          {SECTIONS.map(c => (
            <Link key={c.slug} href={`/produtos?categoria=${c.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div data-product-image style={{
                aspectRatio: '3/4',
                borderRadius: 'var(--r-image)',
                overflow: 'hidden', marginBottom: 18,
                position: 'relative',
              }}>
                <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(ellipse at 30% 35%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 55%)',
                }} />
              </div>
              <h3 style={{ margin: '0 0 6px', fontSize: 24 }}>{c.label}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    ),
    continueWhereLeftOff: <ContinueWhereLeftOffSection key="continue" currency={tpl.currency} />,
    recommendedForYou: (
      <HomeVariantGate key="recommended" variant="personalized">
        <RecommendedForYouSection currency={tpl.currency} />
      </HomeVariantGate>
    ),
    anonAffinity: <AnonAffinitySection key="anon" currency={tpl.currency} />,
    new: newArrivals.length > 0 ? (
      <section key="new" style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
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
    ) : null,
    about: (
      <section key="about" style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div data-product-image style={{
            aspectRatio: '4/5',
            borderRadius: 'var(--r-image, 8px)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 55%)',
            }} />
          </div>
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
    ),
    reviews: <HomepageReviews key="reviews" />,
    ugc: (
      <section key="ugc" style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <UgcGallery eyebrow="@atelier" title="Da nossa comunidade" columns={6} />
      </section>
    ),
    trust: trustItems.length > 0 ? (
      <section key="trust" style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
        <div
          data-trust-count={trustItems.length}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(trustItems.length, 4)}, 1fr)`,
            gap: 32,
            borderTop: '1px solid var(--divider)', borderBottom: '1px solid var(--divider)',
            padding: '60px 0',
          }}
        >
          {trustItems.map(t => (
            <div key={t.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
              <span style={{ width: 32, height: 32, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {t.icon}
              </span>
              <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>{t.label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.3, margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    blog: <HomepageBlog key="blog" />,
  };

  return (
    <HomePersonalizationProvider>
      {sections.map(s => blocks[s.id] ?? null)}
    </HomePersonalizationProvider>
  );
}
