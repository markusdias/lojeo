import Link from 'next/link';

// 404 — página não encontrada com mood jewelry-v1.
export default function NotFound() {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '120px 20px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          marginBottom: 16,
        }}
      >
        Erro 404
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          fontWeight: 400,
          lineHeight: 1.1,
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: 20,
        }}
      >
        Página não encontrada
      </h1>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          maxWidth: 460,
          margin: '0 auto 36px',
        }}
      >
        O endereço que você procura mudou ou não existe mais. Volte para a
        coleção ou explore as peças mais queridas pelas clientes.
      </p>

      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/produtos"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'var(--accent)',
            color: 'var(--text-on-accent, #fff)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 'var(--r-button, 4px)',
            textDecoration: 'none',
          }}
        >
          Ver coleção
        </Link>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--divider)',
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Página inicial
        </Link>
      </div>

      <div
        style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: '1px solid var(--divider)',
          fontSize: 13,
          color: 'var(--text-muted)',
        }}
      >
        Procurando algo específico?{' '}
        <Link
          href="/busca"
          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
        >
          Use a busca
        </Link>{' '}
        ou{' '}
        <Link
          href="/comunidade"
          style={{ color: 'var(--accent)', textDecoration: 'underline' }}
        >
          fale com a gente
        </Link>
        .
      </div>
    </div>
  );
}
