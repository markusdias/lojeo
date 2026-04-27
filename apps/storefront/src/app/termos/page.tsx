import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de uso — Atelier',
  robots: { index: false },
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Uso do site',
    body: 'Este site destina-se à venda de joias finas para uso pessoal e não comercial. É proibido reproduzir, duplicar, copiar, revender ou explorar qualquer parte do site ou das peças sem autorização expressa por escrito.',
  },
  {
    title: 'Pagamento',
    body: 'Aceitamos Pix, cartão de crédito (até 6× sem juros) e boleto. O pedido é confirmado após a aprovação do pagamento. Cobranças e estornos seguem as regras do gateway certificado utilizado no checkout.',
  },
  {
    title: 'Entrega',
    body: 'Prazos variam por região e modalidade escolhida no checkout. Pedidos sob medida levam até 21 dias úteis. Frete grátis acima de R$ 500 para todo o Brasil; demais valores são calculados pelo CEP.',
  },
  {
    title: 'Propriedade intelectual',
    body: 'Todo o conteúdo deste site — textos, imagens, logotipos, ícones, fotografias e software — é propriedade exclusiva da marca ou de seus fornecedores e está protegido pelas leis brasileiras de propriedade intelectual.',
  },
  {
    title: 'Limitação de responsabilidade',
    body: 'Não nos responsabilizamos por danos indiretos, incidentais ou consequentes decorrentes do uso ou da incapacidade de usar este site ou seus produtos, exceto nas hipóteses obrigatórias do Código de Defesa do Consumidor.',
  },
  {
    title: 'Modificações',
    body: 'Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação. O uso continuado do site constitui aceitação dos novos termos.',
  },
  {
    title: 'Foro',
    body: 'Estes termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo / SP para dirimir qualquer disputa decorrente deste relacionamento.',
  },
];

export default function TermosPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--container-pad)' }}>
      {/* PageHeader match Static.jsx */}
      <div style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Termos</p>
        <h1 style={{ fontSize: 56, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.05 }}>
          Termos de uso
        </h1>
      </div>

      {/* Long-form intro */}
      <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '60px 0 30px' }}>
        <p>
          Bem-vinda à nossa loja. Ao acessar e utilizar este site, você aceita e concorda em
          cumprir os termos abaixo. Se não concordar com qualquer parte deles, não deverá usar
          nosso site.
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
