import { describe, expect, it } from 'vitest';
import { render } from '@react-email/components';
import { sendEmail } from './client';
import { Welcome } from './templates/welcome';
import { OrderConfirmation } from './templates/order-confirmation';
import { PixGenerated } from './templates/pix';
import { ShippingNotification } from './templates/shipped';
import { TradeApproved } from './templates/trade-approved';

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
