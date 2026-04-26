import { headers } from 'next/headers';

interface ServiceCheck {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  message?: string;
  responseTimeMs?: number;
}

interface StatusResponse {
  overall: 'operational' | 'degraded' | 'down';
  checkedAt: string;
  services: ServiceCheck[];
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  operational: { bg: '#F0FDF4', text: '#166534', label: 'Operacional', emoji: '✓' },
  degraded:    { bg: '#FFF7ED', text: '#92400E', label: 'Degradado',   emoji: '⚠' },
  down:        { bg: '#FEF2F2', text: '#991B1B', label: 'Fora do ar',  emoji: '✕' },
};

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Status do sistema',
  description: 'Monitor de saúde dos serviços da loja em tempo real.',
};

async function fetchStatus(): Promise<StatusResponse> {
  const h = await headers();
  const host = h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https');
  const res = await fetch(`${proto}://${host}/api/status`, { cache: 'no-store' });
  return res.json();
}

export default async function StatusPage() {
  const data = await fetchStatus();
  const overall = STATUS_COLOR[data.overall]!;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '64px var(--container-pad) 80px' }}>
      <header style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
          Status do sistema
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 400, fontFamily: 'var(--font-display)', marginBottom: 16 }}>
          {overall.emoji} Tudo {overall.label.toLowerCase()}
        </h1>
        <div style={{
          display: 'inline-block',
          background: overall.bg,
          color: overall.text,
          fontSize: 14,
          fontWeight: 600,
          padding: '6px 16px',
          borderRadius: 999,
        }}>
          {overall.label}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
          Última verificação: {new Date(data.checkedAt).toLocaleString('pt-BR')}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.services.map(svc => {
          const sc = STATUS_COLOR[svc.status]!;
          return (
            <div
              key={svc.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--divider)',
                borderRadius: 8,
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 500 }}>{svc.name}</p>
                {svc.message && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{svc.message}</p>
                )}
                {svc.responseTimeMs !== undefined && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Resposta em {svc.responseTimeMs}ms
                  </p>
                )}
              </div>
              <span style={{
                background: sc.bg,
                color: sc.text,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 999,
                whiteSpace: 'nowrap',
              }}>
                {sc.emoji} {sc.label}
              </span>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 32, textAlign: 'center' }}>
        Status atualizado a cada visita. Páginas marcadas como "degradado" significam que algum serviço externo está em modo de fallback — a loja continua funcionando.
      </p>
    </main>
  );
}
