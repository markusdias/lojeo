const SAMPLE_REVIEWS = [
  {
    quote: 'Chegou rapidíssimo e a peça é ainda mais bonita pessoalmente. O acabamento à mão faz toda diferença.',
    author: 'Ana Beatriz',
    location: 'São Paulo · SP',
    rating: 5,
  },
  {
    quote: 'Anel de noivado feito sob medida. Atendimento impecável, ourives explicou cada etapa.',
    author: 'Camila R.',
    location: 'Rio de Janeiro · RJ',
    rating: 5,
  },
  {
    quote: 'Comprei pra minha mãe e ela amou. Embalagem presente caprichada, nota fiscal certinha.',
    author: 'Marina S.',
    location: 'Curitiba · PR',
    rating: 5,
  },
];

export function HomepageReviews() {
  return (
    <section style={{ maxWidth: 'var(--container-max)', margin: '120px auto 0', padding: '0 var(--container-pad)' }}>
      <div style={{ marginBottom: 48 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>Depoimentos</p>
        <h2 style={{ margin: 0 }}>Quem comprou conta</h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
        {SAMPLE_REVIEWS.map((r, i) => (
          <figure
            key={i}
            style={{
              margin: 0,
              padding: 28,
              borderRadius: 'var(--r-image, 8px)',
              background: 'var(--surface-sunken, #F4F1E9)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div aria-label={`${r.rating} de 5 estrelas`} style={{ display: 'inline-flex', gap: 2, color: 'var(--accent)' }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <svg key={j} width="16" height="16" viewBox="0 0 24 24" fill={j < r.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
                </svg>
              ))}
            </div>
            <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              &ldquo;{r.quote}&rdquo;
            </blockquote>
            <figcaption style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.author}</strong>
              <span> · {r.location}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
