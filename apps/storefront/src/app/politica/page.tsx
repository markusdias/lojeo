import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de envio — Atelier',
  robots: { index: false },
};

const SECTIONS = [
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
    body: 'Trabalhamos com Correios (PAC e SEDEX), Jadlog e transportadoras expressas para capitais. O prazo de entrega varia conforme a região e modalidade escolhida.',
  },
  {
    title: 'Embalagem',
    body: 'Todas as peças são enviadas em caixa rígida com enchimento de seda, selo de lacre e nota fiscal eletrônica. A embalagem é adequada para presente.',
  },
  {
    title: 'Rastreamento',
    body: 'Você receberá um e-mail com código de rastreamento assim que o pedido for despachado. Rastreie diretamente no site da transportadora ou pela página de pedidos da sua conta.',
  },
];

export default function PoliticaPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px var(--container-pad)' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Informações</p>
      <h1 style={{ marginBottom: 48 }}>Política de envio</h1>

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
