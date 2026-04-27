import type { Metadata } from 'next';
import { GiftCardForm } from './gift-card-form';
import { getActiveTemplate } from '../../template';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vale-presente — Joalheria Atelier',
  description:
    'Presenteie com um vale-presente digital. Quem recebe escolhe a peça que combina, no valor que você define. Validade de 1 ano.',
  alternates: { canonical: '/presente' },
};

export default async function PresentePage() {
  const tpl = await getActiveTemplate();
  return (
    <main
      style={{
        maxWidth: 'var(--container-max, 1200px)',
        margin: '0 auto',
        padding: '0 var(--container-pad, 24px) 96px',
      }}
    >
      <section
        style={{
          paddingTop: 56,
          paddingBottom: 32,
          textAlign: 'center',
          maxWidth: 720,
          margin: '0 auto',
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-muted, #6B6055)',
            margin: '0 0 12px',
          }}
        >
          Vale-presente digital
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display, serif)',
            fontSize: 44,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            margin: '0 0 16px',
            lineHeight: 1.1,
            color: 'var(--text-primary, #14110F)',
          }}
        >
          O presente que sempre acerta
        </h1>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: 'var(--text-secondary, #3D352F)',
            margin: 0,
          }}
        >
          Quem recebe escolhe a peça que combina com o estilo. Você define o valor.
          Entrega imediata por email. Validade de 1 ano.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 480px)',
          gap: 64,
          alignItems: 'start',
          marginTop: 32,
        }}
      >
        <aside
          style={{
            background: 'var(--surface, #fafaf7)',
            border: '1px solid var(--border, rgba(0,0,0,0.08))',
            borderRadius: 'var(--radius-lg, 16px)',
            padding: 40,
          }}
        >
          <p
            style={{
              fontSize: 12,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--accent, #C9A85C)',
              margin: '0 0 12px',
            }}
          >
            Como funciona
          </p>
          <ol
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
            }}
          >
            {[
              {
                title: 'Você escolhe o valor',
                desc: 'A partir de R$ 50. Personaliza com mensagem assinada.',
              },
              {
                title: 'Recebe o código por email',
                desc: 'Quem você presenteia recebe o vale com instruções no mesmo dia.',
              },
              {
                title: 'A pessoa escolhe a peça',
                desc: `Aplica o vale no checkout em ${tpl.name.toLowerCase()} e usa total ou parcial.`,
              },
              {
                title: 'Validade de 1 ano',
                desc: 'Tempo de sobra pra escolher com calma. O saldo restante fica salvo.',
              },
            ].map((step, i) => (
              <li key={step.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'var(--accent, #C9A85C)',
                    color: 'var(--paper, #fff)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: 13,
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontWeight: 600,
                      fontSize: 15,
                      color: 'var(--text-primary, #14110F)',
                    }}
                  >
                    {step.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: 'var(--text-secondary, #3D352F)',
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <GiftCardForm />
      </section>
    </main>
  );
}
