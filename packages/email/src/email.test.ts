import { describe, expect, it, afterEach } from 'vitest';
import { render } from '@react-email/components';
import { sendEmail } from './client';
import { Welcome } from './templates/welcome';
import { OrderConfirmation } from './templates/order-confirmation';
import { PixGenerated } from './templates/pix';
import { ShippingNotification } from './templates/shipped';
import { TradeApproved } from './templates/trade-approved';
import { RecoverCart } from './templates/recover-cart';
import { emailSubjects, getStoreEmailConfig } from './store-config';

const baseFooter = {
  storeDocument: 'CNPJ 00.000.000/0001-00',
  storeAddress: 'São Paulo, SP',
  supportEmail: 'ola@casasolar.com.br',
  unsubscribeUrl: 'https://casasolar.com.br/unsubscribe',
  privacyUrl: 'https://casasolar.com.br/privacidade',
};

describe('sendEmail', () => {
  it('retorna mock sem RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendEmail({
      from: 'no-reply@lojeo.dev',
      to: 'cliente@example.com',
      subject: 'Teste',
      html: '<p>oi</p>',
    });
    expect(r.delivered).toBe(false);
    expect(r.id).toBeNull();
    expect(r.attempts).toBe(0);
  });
});

describe('backoffDelayMs', () => {
  it('attempt 0 → 0ms', async () => {
    const { backoffDelayMs } = await import('./client');
    expect(backoffDelayMs(0)).toBe(0);
  });

  it('attempt 1 → 2000ms', async () => {
    const { backoffDelayMs } = await import('./client');
    expect(backoffDelayMs(1)).toBe(2000);
  });

  it('attempt 2 → 8000ms (4×)', async () => {
    const { backoffDelayMs } = await import('./client');
    expect(backoffDelayMs(2)).toBe(8000);
  });

  it('attempt 3 → 32000ms (4×)', async () => {
    const { backoffDelayMs } = await import('./client');
    expect(backoffDelayMs(3)).toBe(32000);
  });
});

describe('templates jewelry-v1', () => {
  it('Welcome renderiza com tokens jewelry-v1', async () => {
    const html = await render(
      Welcome({
        storeName: 'Casa Solar',
        customerName: 'Maria',
        loginUrl: 'https://casasolar.com.br/conta',
        ...baseFooter,
      }),
    );
    expect(html).toContain('Casa Solar');
    expect(html).toContain('Bem-vinda,');
    expect(html).toContain('Maria');
    expect(html).toContain('Acessar minha conta');
    // Token jewelry-v1 (paper-warm)
    expect(html).toContain('#FAF7F0');
  });

  it('OrderConfirmation renderiza pedido + linhas + CTA', async () => {
    const html = await render(
      OrderConfirmation({
        storeName: 'Casa Solar',
        customerName: 'Maria',
        orderCode: 'PED-184722',
        items: [
          { name: 'Aliança Solitário', detail: 'ouro 18k · aro 14 · 1×', price: 'R$ 2.890,00' },
        ],
        subtotal: 'R$ 2.890,00',
        shippingLabel: 'Frete (Sedex)',
        shippingValue: 'R$ 32,00',
        total: 'R$ 2.922,00',
        trackUrl: 'https://casasolar.com.br/pedido/PED-184722',
        ...baseFooter,
      }),
    );
    expect(html).toContain('Recebemos seu pedido');
    expect(html).toContain('PED-184722');
    expect(html).toContain('Aliança Solitário');
    expect(html).toContain('R$ 2.922,00');
    expect(html).toContain('Acompanhar pedido');
  });

  it('PixGenerated renderiza QR + copia-e-cola + expiração', async () => {
    const html = await render(
      PixGenerated({
        storeName: 'Casa Solar',
        qrImageUrl: 'https://cdn.casasolar.com.br/pix/abc.png',
        pixCopyPaste: '00020126580014BR.GOV.BCB.PIX0136abc',
        amount: 'R$ 2.776,90',
        discountLabel: 'Desconto Pix (5%)',
        discountValue: '– R$ 145,10',
        expiresInLabel: '30 minutos',
        ...baseFooter,
      }),
    );
    expect(html).toContain('Seu Pix está pronto');
    expect(html).toContain('00020126580014BR.GOV.BCB.PIX0136abc');
    expect(html).toContain('30 minutos');
    expect(html).toContain('Desconto Pix');
  });

  it('ShippingNotification renderiza rastreio + trajeto', async () => {
    const html = await render(
      ShippingNotification({
        storeName: 'Casa Solar',
        estimatedDelivery: '22 abr',
        trackingCode: 'BR123456789',
        trackingUrl: 'https://rastreio.com/BR123456789',
        stops: [
          { status: 'done', label: 'Postado', date: '16 abr · São Paulo' },
          { status: 'current', label: 'Em trânsito', date: 'hoje · Rio de Janeiro' },
          { status: 'future', label: 'Entregue', date: 'previsto 22 abr' },
        ],
        ...baseFooter,
      }),
    );
    expect(html).toContain('Sua peça está a caminho');
    expect(html).toContain('BR123456789');
    expect(html).toContain('Em trânsito');
    expect(html).toContain('Acompanhar entrega');
  });

  it('RecoverCart renderiza items + subtotal + CTA bilingual', async () => {
    const htmlPt = await render(
      RecoverCart({
        storeName: 'Casa Solar',
        customerName: 'Maria',
        items: [
          { name: 'Anel Aço 4mm', qty: 1, priceCents: 12000 },
          { name: 'Brinco Pérola', qty: 2, priceCents: 25000 },
        ],
        subtotalCents: 12000 + 2 * 25000,
        currency: 'BRL',
        cartUrl: 'https://casasolar.com.br/carrinho',
      }),
    );
    expect(htmlPt).toContain('Casa Solar');
    expect(htmlPt).toContain('Anel Aço 4mm');
    expect(htmlPt).toContain('Olá, Maria');
    expect(htmlPt).toContain('Continuar minha compra');

    const htmlEn = await render(
      RecoverCart({
        storeName: 'Roastery',
        items: [{ name: 'Ethiopia 250g', qty: 1, priceCents: 1800 }],
        subtotalCents: 1800,
        currency: 'USD',
        cartUrl: 'https://roastery.com/cart',
      }),
    );
    expect(htmlEn).toContain('Continue checkout');
    expect(htmlEn).toContain('Ethiopia 250g');
    expect(htmlEn).toContain('You left something behind');
  });

  it('TradeApproved renderiza etiqueta reversa + steps', async () => {
    const html = await render(
      TradeApproved({
        storeName: 'Casa Solar',
        labelPdfUrl: 'https://cdn.casasolar.com.br/etiquetas/abc.pdf',
        ...baseFooter,
      }),
    );
    expect(html).toContain('Troca aprovada');
    expect(html).toContain('Baixar etiqueta');
    expect(html).toContain('Imprima a etiqueta');
    // defaults aplicados (texto pode ter <!-- --> entre números/strings)
    expect(html).toContain('7 dias para postar');
    expect(html).toMatch(/em até\s*(<!-- -->)?\s*3(<!-- -->)?\s*dias úteis/);
  });
});

describe('emailSubjects i18n', () => {
  it('pt-BR retorna subjects em português', () => {
    const subj = emailSubjects('pt-BR');
    expect(subj.orderConfirmed).toBe('Pedido confirmado');
    expect(subj.welcome).toBe('Bem-vinda à');
    expect(subj.pixGenerated).toBe('Seu Pix');
    expect(subj.boletoGenerated).toBe('Seu boleto');
    expect(subj.shippingNotification).toBe('Seu pedido foi enviado');
    expect(subj.recoverCart).toBe('Seu carrinho está esperando');
  });

  it('en-US retorna subjects em inglês', () => {
    const subj = emailSubjects('en-US');
    expect(subj.orderConfirmed).toBe('Order confirmed');
    expect(subj.welcome).toBe('Welcome to');
    expect(subj.pixGenerated).toBe('Your Pix');
    expect(subj.boletoGenerated).toBe('Your boleto');
    expect(subj.shippingNotification).toBe('Your order has shipped');
    expect(subj.recoverCart).toBe('Your cart is waiting');
  });
});

describe('getStoreEmailConfig locale + currency', () => {
  const ORIG = { ...process.env };
  afterEach(() => { process.env = { ...ORIG }; });

  it('default locale=pt-BR + currency=BRL', () => {
    delete process.env.STOREFRONT_LOCALE;
    delete process.env.STOREFRONT_CURRENCY;
    const c = getStoreEmailConfig();
    expect(c.locale).toBe('pt-BR');
    expect(c.currency).toBe('BRL');
  });

  it('STOREFRONT_LOCALE=en-US persiste em config', () => {
    process.env.STOREFRONT_LOCALE = 'en-US';
    process.env.STOREFRONT_CURRENCY = 'USD';
    const c = getStoreEmailConfig();
    expect(c.locale).toBe('en-US');
    expect(c.currency).toBe('USD');
  });

  it('locale invalido cai em fallback pt-BR', () => {
    process.env.STOREFRONT_LOCALE = 'fr-FR';
    const c = getStoreEmailConfig();
    expect(c.locale).toBe('pt-BR');
  });
});
