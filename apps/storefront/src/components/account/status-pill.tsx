// StatusPill — paleta jewelry-v1 (ref: Account.jsx -> StatusPill).
// Cores tonais sóbrias para combinar com o template de joias premium.

interface StatusPillProps {
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  paid: 'Pago',
  preparing: 'Em preparação',
  shipped: 'A caminho',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  exchanged: 'Trocado',
};

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#F4E6E6', fg: '#A84444' },
  paid: { bg: '#EEF2E8', fg: '#5C7A4A' },
  preparing: { bg: '#F4F1E9', fg: '#8B7649' },
  shipped: { bg: '#F6EEDC', fg: '#B8853A' },
  delivered: { bg: '#EEF2E8', fg: '#5C7A4A' },
  cancelled: { bg: '#F4F4F2', fg: '#6B6055' },
  exchanged: { bg: '#F4F4F2', fg: '#6B6055' },
};

export function StatusPill({ status }: StatusPillProps) {
  const tone = STATUS_TONE[status] ?? STATUS_TONE.delivered!;
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      style={{
        fontSize: 11,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        display: 'inline-block',
      }}
    >
      {label}
    </span>
  );
}
