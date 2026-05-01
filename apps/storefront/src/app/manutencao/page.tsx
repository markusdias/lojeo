import { redirect } from 'next/navigation';
import { getTenantRuntimeConfig } from '../../lib/tenant-config';
import { getActiveTemplate } from '../../template';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Loja em manutenção',
  robots: { index: false, follow: false },
};

function formatEta(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

export default async function MaintenancePage() {
  const config = await getTenantRuntimeConfig();
  const tpl = await getActiveTemplate();

  // Sem manutenção ativa: redireciona pro home (nunca expor /manutencao com loja viva).
  if (!config.maintenance.enabled) {
    redirect('/');
  }

  const message = config.maintenance.message || 'Estamos fazendo melhorias';
  const etaLabel = formatEta(config.maintenance.etaIso);
  const contact = config.maintenance.contactEmail;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        background: 'var(--bg, #FAFAF6)',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
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
          {tpl.name}
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(40px, 6vw, 64px)',
            fontWeight: 400,
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 24,
          }}
        >
          Loja em manutenção
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            maxWidth: 480,
            margin: '0 auto 28px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </p>

        {etaLabel && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 22px',
              border: '1px solid var(--divider)',
              borderRadius: 4,
              fontSize: 14,
              color: 'var(--text-primary)',
              marginBottom: 36,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
              }}
            >
              Voltamos em
            </span>
            <strong style={{ fontWeight: 500 }}>{etaLabel}</strong>
          </div>
        )}

        {contact && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
            Precisa falar com a gente?{' '}
            <a
              href={`mailto:${contact}`}
              style={{ color: 'var(--accent)', textDecoration: 'underline' }}
            >
              {contact}
            </a>
          </p>
        )}
      </div>
    </main>
  );
}
