'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckoutProvider } from '../../components/checkout/checkout-provider';

const STEPS = [
  { key: 'endereco', label: 'Endereço', href: '/checkout/endereco' },
  { key: 'frete', label: 'Frete', href: '/checkout/frete' },
  { key: 'pagamento', label: 'Pagamento', href: '/checkout/pagamento' },
  { key: 'confirmacao', label: 'Confirmação', href: '/checkout/confirmacao' },
];

function CheckoutStepper() {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex(s => pathname.endsWith(s.key));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 40 }}>
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, display: 'grid', placeItems: 'center',
                fontSize: 12, fontWeight: 600, flexShrink: 0,
                background: done ? 'var(--accent)' : active ? 'var(--text-primary)' : 'var(--surface-sunken)',
                color: done || active ? '#fff' : 'var(--text-muted)',
                border: active ? '2px solid var(--text-primary)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--text-primary)' : done ? 'var(--text-secondary)' : 'var(--text-muted)',
              }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: '0 12px',
                background: i < currentIdx ? 'var(--accent)' : 'var(--divider)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <CheckoutProvider>
      <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', padding: '40px var(--container-pad) 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-primary)' }}>
            Atelier
          </Link>
          <Link href="/carrinho" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            ← Voltar à sacola
          </Link>
        </div>

        <CheckoutStepper />

        {children}
      </div>
    </CheckoutProvider>
  );
}
