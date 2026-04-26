import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de uso — Atelier',
  robots: { index: false },
};

const SECTIONS = [
  {
    title: 'Aceitação dos termos',
    body: 'Ao acessar e utilizar este site, você aceita e concorda em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá usar nosso site.',
  },
  {
    title: 'Uso do site',
    body: 'Este site destina-se ao uso pessoal e não comercial. É proibido reproduzir, duplicar, copiar, vender ou explorar qualquer parte do site sem autorização expressa por escrito.',
  },
  {
    title: 'Propriedade intelectual',
    body: 'Todo o conteúdo presente neste site — incluindo textos, imagens, logotipos, ícones e software — é propriedade exclusiva da marca ou de seus fornecedores, protegido pelas leis brasileiras de propriedade intelectual.',
  },
  {
    title: 'Precisão das informações',
    body: 'Nos esforçamos para garantir que as informações sobre produtos, preços e disponibilidade sejam precisas. No entanto, não garantimos que o site seja livre de erros. Reservamo-nos o direito de corrigir erros sem aviso prévio.',
  },
  {
    title: 'Limitação de responsabilidade',
    body: 'Não seremos responsáveis por quaisquer danos indiretos, incidentais ou consequentes decorrentes do uso ou incapacidade de usar este site ou seus produtos.',
  },
  {
    title: 'Modificações',
    body: 'Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entram em vigor imediatamente após a publicação. O uso continuado do site constitui aceitação dos novos termos.',
  },
  {
    title: 'Legislação aplicável',
    body: 'Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da Comarca de São Paulo, SP.',
  },
];

export default function TermosPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '80px var(--container-pad)' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Legal</p>
      <h1 style={{ marginBottom: 48 }}>Termos de uso</h1>

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
