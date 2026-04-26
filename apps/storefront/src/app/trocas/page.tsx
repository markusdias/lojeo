import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trocas e devoluções — Atelier',
  robots: { index: false },
};

const TABLE_ROWS: { situacao: string; prazo: string; custo: string }[] = [
  { situacao: 'Troca por outro tamanho', prazo: 'até 7 dias', custo: 'frete por nossa conta' },
  { situacao: 'Defeito de fabricação', prazo: 'até 1 ano', custo: 'cobertura total' },
  { situacao: 'Arrependimento', prazo: 'até 7 dias', custo: 'frete por nossa conta' },
  { situacao: 'Sob medida', prazo: 'apenas defeito', custo: '—' },
];

const TH_STYLE = {
  textAlign: 'left' as const,
  padding: '12px 16px',
  fontSize: 11,
  letterSpacing: '.12em',
  textTransform: 'uppercase' as const,
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

const TD_STYLE = {
  padding: '14px 16px',
  borderBottom: '1px solid var(--divider)',
  fontSize: 14,
};

export default function TrocasPage() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 var(--container-pad)' }}>
      {/* Page header match Static.jsx PageHeader */}
      <div style={{ padding: '60px 0 30px' }}>
        <p className="eyebrow" style={{ marginBottom: 12 }}>Política</p>
        <h1 style={{ fontSize: 56, margin: 0, fontFamily: 'var(--font-display)', lineHeight: 1.05 }}>
          Trocas e devoluções
        </h1>
      </div>

      {/* Long content */}
      <div style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.7, color: 'var(--text-secondary)', padding: '60px 0 30px' }}>
        <p style={{ marginBottom: 24 }}>
          Você tem 7 dias corridos a partir do recebimento para solicitar troca ou devolução.
          A peça deve estar com etiqueta, embalagem original e sem sinais de uso.
        </p>
        <p>
          Para iniciar, acesse <em>Conta › Pedidos › Abrir troca</em>. Enviamos uma etiqueta
          reversa por email. O reembolso é processado em até 7 dias úteis após o recebimento.
        </p>
      </div>

      {/* Tabela prazos */}
      <h3 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 24,
        marginTop: 40,
        marginBottom: 16,
      }}>
        Prazos por situação
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--divider)' }}>
            <th style={TH_STYLE}>Situação</th>
            <th style={TH_STYLE}>Prazo</th>
            <th style={TH_STYLE}>Custo</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map(r => (
            <tr key={r.situacao}>
              <td style={TD_STYLE}>{r.situacao}</td>
              <td style={TD_STYLE}>{r.prazo}</td>
              <td style={{ ...TD_STYLE, color: 'var(--text-secondary)' }}>{r.custo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ height: 80 }} />
    </div>
  );
}
