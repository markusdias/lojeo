import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trocas e devoluções — Atelier',
  robots: { index: false },
};

const SECTIONS = [
  {
    title: 'Prazo para troca ou devolução',
    body: 'Você tem 30 dias corridos a partir do recebimento do pedido para solicitar troca ou devolução, conforme o Código de Defesa do Consumidor.',
  },
  {
    title: 'Como solicitar',
    body: 'Acesse sua conta, vá em "Meus pedidos" e clique em "Solicitar troca ou devolução". Ou envie um e-mail para atendimento@atelier.com com o número do pedido e o motivo.',
  },
  {
    title: 'Condições',
    body: 'A peça deve estar sem sinais de uso, com a embalagem original e nota fiscal. Peças personalizadas (gravação, ajuste de tamanho feito por você) não são elegíveis para devolução — apenas para garantia de defeito.',
  },
  {
    title: 'Reembolso',
    body: 'O reembolso é realizado em até 5 dias úteis após o recebimento da peça devolvida em nossa central. O crédito aparece na fatura do cartão conforme o prazo do banco emissor.',
  },
  {
    title: 'Frete de devolução',
    body: 'Custeamos o frete de devolução em casos de defeito de fabricação. Em trocas por outro motivo (tamanho, preferência), o frete de envio de volta é por conta do cliente.',
  },
];

export default function TrocasPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px var(--container-pad)' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Informações</p>
      <h1 style={{ marginBottom: 48 }}>Trocas e devoluções</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        {SECTIONS.map(s => (
          <div key={s.title}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>{s.title}</h2>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
