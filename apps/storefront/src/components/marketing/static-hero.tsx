import Link from 'next/link';

interface HeroCta {
  label: string;
  href: string;
}

interface StaticHeroProps {
  headline: string;
  subheadline: string;
  cta: HeroCta;
  eyebrow?: string;
}

/**
 * StaticHero — hero não-personalizado, sem segmentação RFM nem A/B de copy.
 * Usado pela variante `control` do experimento `homepage_personalization`
 * para servir como baseline de comparação contra `PersonalizedHero`.
 *
 * Mantém paridade visual com HeroExperiment (mesmos paddings, tipografia,
 * CTA primário+secundário) — ver
 * docs/design-system-jewelry-v1/project/ui_kits/storefront/Home.jsx#Hero
 */
export function StaticHero({ headline, subheadline, cta, eyebrow = "Coleção · Outono '26" }: StaticHeroProps) {
  return (
    <div style={{ maxWidth: 560, color: 'var(--text-primary)' }}>
      <p
        className="eyebrow"
        style={{
          marginBottom: 20,
          color: 'var(--accent)',
        }}
      >
        {eyebrow}
      </p>
      <h1 style={{ margin: '0 0 20px', lineHeight: 1.05 }}>{headline}</h1>
      <p
        style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          lineHeight: 1.6,
          maxWidth: 360,
        }}
      >
        {subheadline}
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href={cta.href}
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: 'var(--accent)',
            color: 'var(--text-on-accent, #fff)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 'var(--r-button, 8px)',
            letterSpacing: '0.02em',
          }}
        >
          {cta.label}
        </Link>
        <Link
          href="/sobre"
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--text-primary)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 'var(--r-button, 8px)',
          }}
        >
          Nossa história
        </Link>
      </div>
    </div>
  );
}
