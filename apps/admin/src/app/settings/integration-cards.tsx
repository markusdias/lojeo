'use client';

interface IntegrationCardProps {
  logo: string;
  logoBg: string;
  name: string;
  desc: string;
  status: 'connected' | 'partial' | 'disconnected' | 'optional';
  account?: string;
  statusDetail?: string;
}

const STATUS_LABELS: Record<IntegrationCardProps['status'], string> = {
  connected: 'Conectado',
  partial: 'Parcial',
  disconnected: 'Desconectado',
  optional: 'Opcional',
};

const STATUS_TONES: Record<IntegrationCardProps['status'], { bg: string; fg: string; dot: string }> = {
  connected: { bg: 'var(--success-soft)', fg: 'var(--success)', dot: 'var(--success)' },
  partial: { bg: 'var(--warning-soft)', fg: 'var(--warning)', dot: 'var(--warning)' },
  disconnected: { bg: 'var(--error-soft)', fg: 'var(--error)', dot: 'var(--error)' },
  optional: { bg: 'var(--neutral-100)', fg: 'var(--fg-secondary)', dot: 'var(--fg-muted)' },
};

export function IntegrationCard({ logo, logoBg, name, desc, status, account, statusDetail }: IntegrationCardProps) {
  const tone = STATUS_TONES[status];
  const connected = status === 'connected' || status === 'partial';

  return (
    <div className="lj-card" style={{ padding: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--space-4)', alignItems: 'center' }}>
      {/* Logo */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 'var(--radius-md)',
        background: logoBg,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'var(--w-semibold)',
        fontSize: 14,
        flexShrink: 0,
      }}>
        {logo}
      </div>

      {/* Body */}
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 'var(--w-semibold)', fontSize: 'var(--text-body)', marginBottom: 2 }}>
          {name}
        </p>
        <p className="caption" style={{ color: 'var(--fg-secondary)', marginBottom: 6 }}>{desc}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--text-caption)',
            fontWeight: 'var(--w-medium)',
            background: tone.bg,
            color: tone.fg,
          }}>
            <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: tone.dot, display: 'inline-block' }} />
            {STATUS_LABELS[status]}
            {statusDetail && ` · ${statusDetail}`}
          </span>
          {account && (
            <span className="caption mono" style={{ color: 'var(--fg-muted)' }}>
              {account}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        {connected ? (
          <>
            <button type="button" className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px' }}>
              Ressincronizar
            </button>
            <button type="button" className="lj-btn-secondary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px' }}>
              Gerenciar
            </button>
          </>
        ) : (
          <button type="button" className="lj-btn-primary" style={{ fontSize: 'var(--text-caption)', padding: '6px 12px' }}>
            Conectar
          </button>
        )}
      </div>
    </div>
  );
}

// Cards pre-configurados por categoria

export function GatewaysCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard
        logo="MP"
        logoBg="#00B1EA"
        name="Mercado Pago"
        desc="Pix, boleto, cartão · taxa 4,99%"
        status="disconnected"
      />
      <IntegrationCard
        logo="P."
        logoBg="#0E1116"
        name="Pagar.me"
        desc="Adquirente full · taxa 2,99%"
        status="disconnected"
      />
      <IntegrationCard
        logo="St"
        logoBg="#635BFF"
        name="Stripe"
        desc="Internacional · cartão e Apple Pay"
        status="optional"
      />
      <IntegrationCard
        logo="PP"
        logoBg="#003087"
        name="PayPal"
        desc="Internacional · 100+ moedas"
        status="optional"
      />
    </div>
  );
}

export function FreteCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard
        logo="ME"
        logoBg="#0FAA00"
        name="Melhor Envio"
        desc="Correios, Jadlog, Latam Cargo"
        status="disconnected"
      />
      <IntegrationCard
        logo="C"
        logoBg="#FFE600"
        name="Correios direto"
        desc="Contrato próprio · cartão postagem"
        status="optional"
      />
      <IntegrationCard
        logo="DHL"
        logoBg="#D40511"
        name="DHL Express"
        desc="Internacional door-to-door"
        status="optional"
      />
      <IntegrationCard
        logo="FX"
        logoBg="#4D148C"
        name="FedEx"
        desc="Internacional · 220+ países"
        status="optional"
      />
    </div>
  );
}

export function FiscalCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard
        logo="Bl"
        logoBg="#0EA5E9"
        name="Bling"
        desc="ERP + NF-e · sync 5min"
        status="disconnected"
      />
      <IntegrationCard
        logo="Ol"
        logoBg="#7C3AED"
        name="Olist Tiny"
        desc="ERP · NF-e · estoque"
        status="optional"
      />
    </div>
  );
}

export function EmailCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <IntegrationCard
        logo="R"
        logoBg="#000000"
        name="Resend"
        desc="API simples · domínio verificado"
        status="disconnected"
      />
      <IntegrationCard
        logo="SG"
        logoBg="#1A82E2"
        name="SendGrid"
        desc="Volume alto · entregabilidade"
        status="optional"
      />
    </div>
  );
}
