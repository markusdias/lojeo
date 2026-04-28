import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nossa história — Atelier',
  description: 'Joias feitas à mão, ouro 18k e prata 925 certificada. Atelier em São Paulo.',
};

export default function SobrePage() {
  return (
    <article>
      {/* Hero match Static.jsx PageAbout */}
      <section style={{
        aspectRatio: '21/8',
        background: 'linear-gradient(135deg, var(--accent-soft, #F2EAD9) 0%, var(--accent-soft, #F2EAD9) 40%, var(--accent, #B8956A) 160%)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-primary)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 700, padding: 40 }}>
          <p className="eyebrow" style={{ marginBottom: 16 }}>Nossa história</p>
          <h1 style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            margin: 0,
            lineHeight: 1.05,
            fontFamily: 'var(--font-display)',
          }}>
            Joias feitas à mão, para durar uma vida.
          </h1>
        </div>
      </section>

      {/* Long content + sections */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--container-pad)' }}>
        <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '60px 0 30px' }}>
          <p>
            Começamos em 2014, em uma pequena bancada no centro de São Paulo. Hoje, três
            joalheiras trabalham com a gente — e cada peça ainda é finalizada à mão.
          </p>
        </div>

        <ContentSection
          title="Materiais"
          body="Trabalhamos exclusivamente com ouro 18k, ouro branco e prata 925 certificada. Nada de banhos. Nada de aço. Apenas metais nobres que envelhecem bonito."
        />
        <ContentSection
          title="Processo"
          body="Cada peça é desenhada, fundida, polida e aferida manualmente. Levamos de 3 a 5 dias úteis para finalizar — sob medida, até 21 dias."
        />
        <ContentSection
          title="Garantia"
          body="Toda peça tem 1 ano de cobertura contra defeitos de fabricação. Polimento e ajustes leves são vitalícios."
        />

        {/* Gallery */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '60px 0' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              data-product-image
              style={{
                aspectRatio: i === 1 ? '3/4' : '4/5',
                borderRadius: 'var(--r-image, 4px)',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
                fontSize: 32,
                position: 'relative',
              }}
              aria-hidden
            >
              <div data-product-placeholder style={{ position: 'absolute', inset: 0 }} />
              <span style={{ position: 'relative', color: 'var(--text-muted)' }}>◆</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          background: 'var(--surface)',
          padding: 48,
          borderRadius: 8,
          textAlign: 'center',
          margin: '20px 0 80px',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            margin: '0 0 14px',
          }}>
            Conheça as peças
          </h3>
          <Link
            href="/produtos"
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'var(--accent)',
              color: 'var(--text-on-accent, #fff)',
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 'var(--r-button, 8px)',
              textDecoration: 'none',
            }}
          >
            Ver coleção
          </Link>
        </div>
      </div>
    </article>
  );
}

function ContentSection({ title, body }: { title: string; body: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '200px 1fr',
      gap: 60,
      padding: '32px 0',
      borderTop: '1px solid var(--divider)',
    }}>
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 28,
        margin: 0,
      }}>
        {title}
      </h3>
      <p style={{
        margin: 0,
        color: 'var(--text-secondary)',
        fontSize: 16,
        lineHeight: 1.7,
        maxWidth: 580,
      }}>
        {body}
      </p>
    </div>
  );
}
