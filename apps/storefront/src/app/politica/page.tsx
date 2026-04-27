import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de envio — Atelier',
  robots: { index: false },
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Prazo de envio',
    body: 'Pedidos confirmados até às 14h em dias úteis são despachados no mesmo dia. Peças personalizadas (gravação, ajuste de aro) têm prazo adicional de 3 a 5 dias úteis, informado no checkout.',
  },
  {
    title: 'Frete grátis',
    body: 'Frete grátis para compras acima de R$ 500 para todo o Brasil. Para pedidos abaixo deste valor, o frete é calculado pelo CEP no checkout.',
  },
  {
    title: 'Transportadoras',
    body: 'Trabalhamos com Correios (PAC e SEDEX), Jadlog e transportadoras expressas para capitais. O prazo de entrega varia conforme a região e a modalidade escolhida.',
  },
  {
    title: 'Embalagem',
    body: 'Todas as peças seguem em caixa rígida com enchimento de seda, selo de lacre e nota fiscal eletrônica. A embalagem é adequada para presente.',
  },
  {
    title: 'Rastreamento',
    body: 'Você recebe um email com código de rastreamento assim que o pedido é despachado. Acompanhe direto no site da transportadora ou pela página de pedidos da sua conta.',
  },
];

export default function PoliticaPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--container-pad)' }}>
      {/* PageHeader match Static.jsx */}
      <div style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Política</p>
        <h1 style={{ fontSize: 56, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.05 }}>
          Política de envio
        </h1>
      </div>

      {/* Long-form intro */}
      <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '60px 0 30px' }}>
        <p>
          Enviamos para todo o Brasil. Aqui você encontra prazos, transportadoras e como
          rastrear seu pedido — tudo que precisa saber antes de fechar a compra.
        </p>
      </div>

      {/* Seções no padrão Static ContentSection */}
      {SECTIONS.map(s => (
        <div
          key={s.title}
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: 60,
            padding: '32px 0',
            borderTop: '1px solid var(--divider)',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0 }}>{s.title}</h3>
          <p style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 580,
          }}>
            {s.body}
          </p>
        </div>
      ))}

      <div style={{ height: 80 }} />
    </div>
  );
}
