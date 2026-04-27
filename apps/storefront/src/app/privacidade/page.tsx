import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacidade · LGPD — Atelier',
  robots: { index: false },
};

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Dados que coletamos',
    body: 'Nome, CPF, endereço, email e telefone — exclusivamente para processar pedidos, emitir nota fiscal e prestar atendimento. Dados de pagamento são processados por gateway certificado e não ficam armazenados em nossos sistemas.',
  },
  {
    title: 'Como usamos seus dados',
    body: 'Usamos seus dados para processar e entregar pedidos, enviar atualizações de status e — com seu consentimento — enviar comunicações de marketing. Nunca vendemos ou compartilhamos seus dados com terceiros para fins comerciais.',
  },
  {
    title: 'Cookies e rastreamento',
    body: 'Utilizamos cookies essenciais (necessários para o funcionamento da loja) e cookies analíticos e de marketing (opcionais, solicitados via banner de consentimento). Você pode revogar o consentimento a qualquer momento nas configurações da sua conta.',
  },
  {
    title: 'Seus direitos',
    body: 'Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode solicitar acesso, correção, anonimização, portabilidade ou exclusão dos seus dados a qualquer momento, escrevendo para privacidade@atelier.com.br.',
  },
  {
    title: 'Retenção de dados',
    body: 'Dados de pedido são mantidos por 5 anos (obrigação fiscal). Dados de navegação anônimos são mantidos por 24 meses. Dados de conta são excluídos em até 30 dias após solicitação, respeitados os prazos legais.',
  },
  {
    title: 'Contato',
    body: 'Dúvidas sobre privacidade? Fale com nosso encarregado de dados (DPO): privacidade@atelier.com.br. Esta política foi atualizada em abril de 2026.',
  },
];

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--container-pad)' }}>
      {/* PageHeader match Static.jsx */}
      <div style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Política</p>
        <h1 style={{ fontSize: 56, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.05 }}>
          Privacidade · LGPD
        </h1>
      </div>

      {/* Long-form intro */}
      <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '60px 0 30px' }}>
        <p>
          Esta política descreve como coletamos, usamos e protegemos seus dados, em conformidade
          com a Lei Geral de Proteção de Dados (Lei 13.709/2018).
        </p>
      </div>

      {/* Seções no padrão Static ContentSection (200px label + body) */}
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
