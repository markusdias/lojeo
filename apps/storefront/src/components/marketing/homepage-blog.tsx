import Link from 'next/link';

const SAMPLE_POSTS = [
  {
    slug: 'cuidados-ouro-18k',
    title: 'Como cuidar de joias em ouro 18k',
    excerpt: 'Pequenos hábitos que mantêm o brilho original e prolongam a vida da peça.',
    eyebrow: 'Cuidados',
  },
  {
    slug: 'origem-rastreavel',
    title: 'Origem rastreável: o que isso significa',
    excerpt: 'Como acompanhamos cada gema desde a mina até o ateliê.',
    eyebrow: 'Sustentabilidade',
  },
  {
    slug: 'guia-aliancas',
    title: 'Guia para escolher alianças',
    excerpt: 'Larguras, acabamentos, gravações — o passo a passo da decisão.',
    eyebrow: 'Guia',
  },
];

export function HomepageBlog() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 48 }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Editorial</p>
          <h2 style={{ margin: 0 }}>Do ateliê</h2>
        </div>
        <Link href="/blog" style={{ fontSize: 14, borderBottom: '1px solid var(--text-primary)', paddingBottom: 2, color: 'var(--text-primary)' }}>
          ver todos
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        {SAMPLE_POSTS.map(p => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
          >
            <div
              aria-hidden
              style={{
                aspectRatio: '4/3',
                background: 'linear-gradient(140deg, #EFE6D2 0%, #D8C9AC 100%)',
                borderRadius: 'var(--r-image, 8px)',
                marginBottom: 18,
              }}
            />
            <p className="eyebrow" style={{ marginBottom: 8 }}>{p.eyebrow}</p>
            <h3 style={{ fontSize: 22, margin: '0 0 8px', lineHeight: 1.2 }}>{p.title}</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
