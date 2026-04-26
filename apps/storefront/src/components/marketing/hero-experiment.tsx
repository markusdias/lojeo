'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAnonId } from '@lojeo/tracking/client';

const EXPERIMENT_KEY = 'homepage-hero';

interface HeroCta {
  label: string;
  href: string;
}

interface HeroVariantPayload {
  headline?: string;
  subheadline?: string;
  cta?: HeroCta;
}

interface AssignmentResponse {
  assignments?: Record<string, { variantKey: string; payload: HeroVariantPayload | null }>;
}

interface HeroExperimentProps {
  defaultHeadline: string;
  defaultSubheadline: string;
  defaultCta: HeroCta;
}

interface ResolvedHero {
  headline: string;
  subheadline: string;
  cta: HeroCta;
  variantKey: string | null;
}

export function HeroExperiment({
  defaultHeadline,
  defaultSubheadline,
  defaultCta,
}: HeroExperimentProps) {
  const [resolved, setResolved] = useState<ResolvedHero | null>(null);
  const [anonId, setAnonId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const id = getAnonId();
    setAnonId(id);

    const url = `/api/experiments?keys=${encodeURIComponent(EXPERIMENT_KEY)}&anonymousId=${encodeURIComponent(id)}`;

    fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? (r.json() as Promise<AssignmentResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        const assignment = data?.assignments?.[EXPERIMENT_KEY];
        if (assignment && assignment.payload) {
          const p = assignment.payload;
          setResolved({
            headline: typeof p.headline === 'string' && p.headline.trim() ? p.headline : defaultHeadline,
            subheadline:
              typeof p.subheadline === 'string' && p.subheadline.trim() ? p.subheadline : defaultSubheadline,
            cta:
              p.cta && typeof p.cta.label === 'string' && typeof p.cta.href === 'string'
                ? p.cta
                : defaultCta,
            variantKey: assignment.variantKey,
          });
        } else {
          setResolved({
            headline: defaultHeadline,
            subheadline: defaultSubheadline,
            cta: defaultCta,
            variantKey: null,
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setResolved({
          headline: defaultHeadline,
          subheadline: defaultSubheadline,
          cta: defaultCta,
          variantKey: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [defaultHeadline, defaultSubheadline, defaultCta]);

  const handleCtaClick = () => {
    if (!resolved || !resolved.variantKey || !anonId) return;
    try {
      fetch('/api/experiments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          experimentKey: EXPERIMENT_KEY,
          variantKey: resolved.variantKey,
          anonymousId: anonId,
          eventType: 'conversion',
        }),
        keepalive: true,
      }).catch(() => null);
    } catch {
      /* noop */
    }
  };

  // Skeleton enquanto carrega — mantém layout estável (mesma altura/posição)
  if (!resolved) {
    return (
      <div
        style={{
          maxWidth: 560,
          color: 'var(--text-primary)',
        }}
        aria-busy="true"
        aria-live="polite"
      >
        <p className="eyebrow" style={{ marginBottom: 20 }}>Coleção · Outono &apos;26</p>
        <div
          style={{
            height: 56,
            width: '80%',
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 6,
            marginBottom: 20,
          }}
        />
        <div
          style={{
            height: 16,
            width: '95%',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: 4,
            marginBottom: 8,
            maxWidth: 360,
          }}
        />
        <div
          style={{
            height: 16,
            width: '60%',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: 4,
            marginBottom: 32,
            maxWidth: 360,
          }}
        />
        <div
          style={{
            height: 48,
            width: 180,
            background: 'rgba(0,0,0,0.08)',
            borderRadius: 8,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 560,
        color: 'var(--text-primary)',
      }}
    >
      <p className="eyebrow" style={{ marginBottom: 20 }}>Coleção · Outono &apos;26</p>
      <h1 style={{ margin: '0 0 20px', lineHeight: 1.05 }}>{resolved.headline}</h1>
      <p
        style={{
          fontSize: 17,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          lineHeight: 1.6,
          maxWidth: 360,
        }}
      >
        {resolved.subheadline}
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link
          href={resolved.cta.href}
          onClick={handleCtaClick}
          style={{
            display: 'inline-block',
            padding: '14px 28px',
            background: 'var(--text-primary)',
            color: 'var(--text-on-dark)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 8,
            letterSpacing: '0.02em',
          }}
        >
          {resolved.cta.label}
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
            borderRadius: 8,
          }}
        >
          Nossa história
        </Link>
      </div>
    </div>
  );
}
