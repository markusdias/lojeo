import { EmailShell, Line, btnPrimary } from './_shell';
import { tokens as t } from './_tokens';

export interface RecoverCartItem {
  name: string;
  qty: number;
  priceCents: number;
  imageUrl?: string | null;
}

export interface RecoverCartProps {
  storeName: string;
  customerName?: string;
  items: RecoverCartItem[];
  subtotalCents: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  cartUrl: string;
  storeDocument?: string;
  storeAddress?: string;
  supportEmail?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
}

function fmt(cents: number, currency: 'BRL' | 'USD' | 'EUR' = 'BRL'): string {
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

export function RecoverCart({
  storeName,
  customerName,
  items,
  subtotalCents,
  currency = 'BRL',
  cartUrl,
  storeDocument,
  storeAddress,
  supportEmail,
  unsubscribeUrl,
  privacyUrl,
}: RecoverCartProps) {
  const isPt = currency === 'BRL';
  const greet = customerName
    ? isPt ? `Olá, ${customerName}` : `Hi, ${customerName}`
    : isPt ? 'Você esqueceu algo' : 'You left something behind';
  const headline = isPt ? 'Seu carrinho está esperando.' : 'Your cart is waiting.';
  const intro = isPt
    ? `Algumas peças continuam reservadas em ${storeName}. Volte a qualquer momento — o carrinho está no mesmo lugar.`
    : `A few items are still saved at ${storeName}. Come back whenever — your cart is right where you left it.`;
  const cta = isPt ? 'Continuar minha compra' : 'Continue checkout';
  const subtotalLabel = isPt ? 'Subtotal' : 'Subtotal';

  return (
    <EmailShell
      preview={isPt ? `Seu carrinho em ${storeName}` : `Your cart at ${storeName}`}
      storeName={storeName}
      storeDocument={storeDocument}
      storeAddress={storeAddress}
      supportEmail={supportEmail}
      unsubscribeUrl={unsubscribeUrl}
      privacyUrl={privacyUrl}
    >
      <tr>
        <td style={{ padding: '40px 40px 16px' }}>
          <div style={{ fontFamily: t.fontDisplay, fontSize: t.fsH2, lineHeight: 1.2, marginBottom: 8 }}>
            {greet}.
          </div>
          <div style={{ fontFamily: t.fontDisplay, fontSize: 22, lineHeight: 1.3, marginBottom: 12 }}>
            {headline}
          </div>
          <div style={{ fontSize: t.fsSmall, color: t.textSecondary, lineHeight: 1.6 }}>
            {intro}
          </div>
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 8px' }}>
          {items.map((it, idx) => (
            <Line
              key={idx}
              k={`${it.name}${it.qty > 1 ? ` × ${it.qty}` : ''}`}
              v={fmt(it.priceCents * it.qty, currency)}
            />
          ))}
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 8px', borderTop: `1px solid ${t.divider}` }}>
          <Line k={subtotalLabel} v={fmt(subtotalCents, currency)} bold />
        </td>
      </tr>
      <tr>
        <td style={{ padding: '8px 40px 32px' }}>
          <a href={cartUrl} style={btnPrimary}>{cta}</a>
        </td>
      </tr>
    </EmailShell>
  );
}
