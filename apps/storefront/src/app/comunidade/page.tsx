import Link from 'next/link';
import { UgcGallery } from '../../components/ugc/ugc-gallery';

export const metadata = {
  title: 'Comunidade — clientes pelo mundo',
  description: 'Galeria de fotos enviadas pelos nossos clientes usando nossas peças.',
};

export default function ComunidadePage() {
  return (
    <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '64px var(--container-pad) 80px' }}>
      <header style={{ marginBottom: 48, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end', gap: 32 }}>
        <div>
          <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
            @atelier — comunidade
          </p>
          <h1 style={{ fontSize: 44, fontWeight: 400, fontFamily: 'var(--font-display)', marginBottom: 16, lineHeight: 1.1 }}>
            Cada peça ganha vida em quem usa
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', maxWidth: 620, lineHeight: 1.6 }}>
            Uma joia sai do ateliê inacabada — só fica pronta quando encontra a pessoa certa.
            Aqui é o nosso álbum: clientes pelo Brasil e pelo mundo mostrando como incorporam
            cada peça no dia a dia, em ocasiões especiais e nos pequenos rituais.
          </p>
        </div>
        <Link
          href="/conta/galeria"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            background: 'var(--ink, #1a1a1a)',
            color: 'var(--paper, #fff)',
            fontSize: 13,
            letterSpacing: '0.04em',
            textDecoration: 'none',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            transition: 'opacity 0.15s ease',
          }}
        >
          Compartilhe sua peça →
        </Link>
      </header>
      <UgcGallery
        eyebrow="@atelier"
        title="Da nossa comunidade"
        showFilters
        columns={4}
      />
      <p style={{ marginTop: 48, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Marque <strong style={{ color: 'var(--ink, #1a1a1a)', fontWeight: 500 }}>@atelier</strong> no
        Instagram ou envie pela sua conta para aparecer aqui.
      </p>
    </main>
  );
}
