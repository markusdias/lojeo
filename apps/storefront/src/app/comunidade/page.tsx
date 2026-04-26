import { UgcGallery } from '../../components/ugc/ugc-gallery';

export const metadata = {
  title: 'Comunidade — clientes pelo mundo',
  description: 'Galeria de fotos enviadas pelos nossos clientes usando nossas peças.',
};

export default function ComunidadePage() {
  return (
    <main style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '64px var(--container-pad) 80px' }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Comunidade
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 400, fontFamily: 'var(--font-display)', marginBottom: 12 }}>
          Quem usa nossas peças
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.5 }}>
          Cada peça vai além do ateliê. Veja como nossas clientes incorporam joias contemporâneas
          no dia a dia. Tem uma foto pra compartilhar? Envie pela sua conta.
        </p>
      </header>
      <UgcGallery />
    </main>
  );
}
