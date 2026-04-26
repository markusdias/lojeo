import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidade — Atelier',
  robots: { index: false },
};

const SECTIONS = [
  {
    title: 'Dados coletados',
    body: 'Coletamos nome, e-mail, endereço de entrega e dados de pagamento (tokenizados — o número do cartão nunca passa pelo nosso servidor) para processar pedidos. Também coletamos dados de comportamento de navegação de forma anônima, conforme seu consentimento.',
  },
  {
    title: 'Como usamos seus dados',
    body: 'Usamos seus dados para processar e entregar pedidos, enviar atualizações de status, e — com seu consentimento — enviar comunicações de marketing. Nunca vendemos ou compartilhamos seus dados com terceiros para fins comerciais.',
  },
  {
    title: 'Cookies e rastreamento',
    body: 'Utilizamos cookies essenciais (necessários para o funcionamento da loja) e cookies analíticos e de marketing (opcionais, solicitados via banner de consentimento). Você pode revogar o consentimento a qualquer momento nas configurações da sua conta.',
  },
  {
    title: 'Seus direitos (LGPD)',
    body: 'Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar exclusão, portabilidade e revogação do consentimento. Envie suas solicitações para privacidade@atelier.com.',
  },
  {
    title: 'Retenção de dados',
    body: 'Dados de pedido são mantidos por 5 anos (obrigação fiscal). Dados de navegação anônimos são mantidos por 24 meses. Dados de conta são excluídos em até 30 dias após solicitação, respeitados os prazos legais.',
  },
  {
    title: 'Contato',
    body: 'Dúvidas sobre privacidade? Fale com nosso encarregado de dados (DPO): privacidade@atelier.com. Esta política foi atualizada em abril de 2026.',
  },
];

export default function PrivacidadePage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px var(--container-pad)' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Legal</p>
      <h1 style={{ marginBottom: 48 }}>Política de privacidade</h1>

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
