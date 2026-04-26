import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nossa história — Atelier',
  description: 'Joalheria contemporânea produzida com ourives independentes em São Paulo.',
};

export default function SobrePage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px var(--container-pad)' }}>
      <p className="eyebrow" style={{ marginBottom: 16 }}>Nossa história</p>
      <h1 style={{ marginBottom: 40, lineHeight: 1.05 }}>
        Cada peça começa<br />numa pequena bancada.
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          Trabalhamos com ourives independentes em São Paulo. Cada peça passa por um processo artesanal rigoroso — da concepção ao acabamento final — antes de chegar até você.
        </p>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          Usamos ouro 18k certificado e prata 925 com rastreabilidade garantida. Acreditamos que uma joia deve durar gerações, não temporadas.
        </p>
        <p style={{ fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          Se você quiser, gravamos sua história à mão. Datas, coordenadas, nomes — qualquer detalhe que transforme uma peça em memória.
        </p>
      </div>

      <div style={{
        marginTop: 64, padding: '32px 0', borderTop: '1px solid var(--divider)',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, textAlign: 'center',
      }}>
        {[
          { num: '12+', label: 'Anos de ofício' },
          { num: '2.400+', label: 'Peças criadas' },
          { num: '12m', label: 'Garantia em todas' },
        ].map(s => (
          <div key={s.label}>
            <p style={{ fontSize: 32, fontFamily: 'var(--font-display)', margin: '0 0 8px' }}>{s.num}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 64 }}>
        <Link href="/produtos" style={{
          display: 'inline-block', padding: '14px 32px',
          background: 'var(--text-primary)', color: 'var(--text-on-dark)',
          fontSize: 14, fontWeight: 500, borderRadius: 8,
        }}>
          Ver coleção
        </Link>
      </div>
    </div>
  );
}
