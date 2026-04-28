'use client';

interface PreviewConfig {
  typo?: 'a' | 'b' | 'c' | string;
  accent?: string;
  bgTone?: string;
  photoStyle?: string;
  imgRadius?: '0' | '8' | '16' | string;
  typeScale?: 'default' | 'larger' | 'smaller' | string;
  hero?: 'image' | 'video' | 'carousel' | 'grid' | string;
  trustSignals?: string[];
}

// Match jewelry-v1 tokens.css SOT
const TONE_BG: Record<string, string> = {
  warm: '#FAFAF6',
  pure: '#FFFFFF',
  cool: '#F7F8FA',
  cream: '#F5EFE3',
};

const ACCENT_HEX: Record<string, string> = {
  champagne: '#B8956A',
  silver: '#9AA0A6',
  'rose-gold': '#C8A28C',
  copper: '#A96B3F',
  'noir-rose': '#5C3A3F',
};

const TYPE_FAMILIES: Record<string, { display: string; body: string; weight: number; size: number }> = {
  a: { display: '"Cormorant Garamond","Cormorant",Georgia,serif', body: 'Inter,system-ui,sans-serif', weight: 500, size: 1 },
  b: { display: '"Playfair Display",Georgia,serif', body: '"Source Sans 3",system-ui,sans-serif', weight: 500, size: 1.02 },
  c: { display: 'Inter,system-ui,sans-serif', body: '"JetBrains Mono",ui-monospace,monospace', weight: 600, size: 0.95 },
};

const RADIUS: Record<string, string> = { '0': '0', '8': '8px', '16': '16px' };

const SCALE_FACTOR: Record<string, number> = { smaller: 0.85, default: 1, larger: 1.15 };

/**
 * StorefrontPreview — mockup estático coerente com config (typo/accent/bgTone/imgRadius/hero/photoStyle/trust).
 * Match Appearance.jsx ref. Não é iframe live — é preview curado que reflete instantaneamente
 * mudanças nos controles (sem rebuild do storefront real).
 */
export function StorefrontPreview({ config }: { config: PreviewConfig }) {
  const bg = TONE_BG[config.bgTone ?? 'warm'] ?? '#FAFAF6';
  const accent = ACCENT_HEX[config.accent ?? 'champagne'] ?? '#B8956A';
  const baseT = TYPE_FAMILIES[config.typo ?? 'a'] ?? TYPE_FAMILIES.a!;
  const scaleFactor = SCALE_FACTOR[config.typeScale ?? 'default'] ?? 1;
  const t = { ...baseT, size: baseT.size * scaleFactor };
  const radius = RADIUS[config.imgRadius ?? '8'] ?? '8px';
  const hero = config.hero ?? 'image';
  const trust = config.trustSignals ?? ['shipping', 'warranty', 'returns', 'payment'];

  return (
    <div style={{ background: bg, fontFamily: t.body, padding: 'clamp(12px, 2vw, 20px)', minHeight: '100%', color: '#1A1A1A' }}>
      {/* Top nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 'clamp(12px, 1.5vw, 18px)',
        borderBottom: `1px solid ${bg === '#FFFFFF' ? '#EAEAEA' : 'rgba(0,0,0,0.08)'}`,
        marginBottom: 'clamp(20px, 3vw, 36px)',
      }}>
        <div style={{
          fontFamily: t.display,
          fontSize: `${22 * t.size}px`,
          fontWeight: 500,
          letterSpacing: '0.16em',
        }}>
          ATELIER VERDE
        </div>
        <div style={{ display: 'flex', gap: 'clamp(12px, 2vw, 24px)', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666' }}>
          <span>Coleções</span>
          <span>Anéis</span>
          <span>Brincos</span>
          <span>Sobre</span>
        </div>
      </div>

      {/* Hero */}
      {(hero === 'image' || hero === 'video') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(16px, 2.5vw, 28px)', alignItems: 'center', marginBottom: 'clamp(28px, 4vw, 48px)' }}>
          <div style={{
            aspectRatio: '4/5',
            background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
            borderRadius: radius,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
          </div>
          <div>
            <p style={{ color: accent, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>
              Nova coleção · Outono 26
            </p>
            <h2 style={{
              fontFamily: t.display,
              fontWeight: t.weight,
              fontSize: `${36 * t.size}px`,
              lineHeight: 1.05,
              margin: '0 0 14px',
              letterSpacing: '-0.01em',
            }}>
              Peças que carregam<br />histórias.
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: '#555', marginBottom: 22, maxWidth: 360 }}>
              Joias contemporâneas feitas à mão em São Paulo, com ouro reciclado e gemas de origem rastreável.
            </p>
            <button type="button" style={{
              padding: '10px 22px',
              border: `1px solid ${accent}`,
              borderRadius: radius,
              color: accent,
              background: 'transparent',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 500,
            }}>
              Explorar coleção <span style={{ marginLeft: 8 }}>→</span>
            </button>
          </div>
        </div>
      )}

      {hero === 'carousel' && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ aspectRatio: '21/9', background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, borderRadius: radius }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{ width: 24, height: 2, background: i === 1 ? accent : '#ccc' }} />
            ))}
          </div>
        </div>
      )}

      {hero === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ aspectRatio: '3/4', background: `linear-gradient(135deg, ${accent}aa, ${accent}55)`, borderRadius: radius }} />
          ))}
        </div>
      )}

      {/* Section title */}
      <h3 style={{
        fontFamily: t.display,
        fontWeight: t.weight,
        fontSize: `${24 * t.size}px`,
        textAlign: 'center',
        marginBottom: 'clamp(20px, 2vw, 28px)',
      }}>
        Mais desejadas
      </h3>

      {/* Product grid 4-up */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(8px, 1vw, 14px)', marginBottom: 'clamp(28px, 3vw, 40px)' }}>
        {[
          { name: 'Anel Solitário Ouro 18k', price: 'R$ 2.490' },
          { name: 'Brinco Pérola Prata 950', price: 'R$ 380' },
          { name: 'Pulseira Veneziana', price: 'R$ 920' },
          { name: 'Colar Elo Cartier', price: 'R$ 1.640' },
        ].map(p => (
          <div key={p.name}>
            <div style={{
              aspectRatio: '1',
              background: bg === '#FFFFFF' ? '#F2EDE2' : 'rgba(0,0,0,0.04)',
              borderRadius: radius,
              marginBottom: 8,
              position: 'relative',
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
            }}>
              <div style={{
                width: '55%',
                height: '55%',
                background: `radial-gradient(circle, ${accent} 0%, ${accent}55 70%)`,
                borderRadius: '50%',
              }} />
            </div>
            <p style={{ fontFamily: t.display, fontSize: 13, fontWeight: t.weight, lineHeight: 1.3, marginBottom: 2 }}>
              {p.name}
            </p>
            <p style={{ fontSize: 12, color: '#555' }}>{p.price}</p>
          </div>
        ))}
      </div>

      {/* Trust signals */}
      {trust.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 'clamp(12px, 2vw, 24px)',
          flexWrap: 'wrap',
          paddingTop: 'clamp(16px, 2vw, 24px)',
          borderTop: `1px solid ${bg === '#FFFFFF' ? '#EAEAEA' : 'rgba(0,0,0,0.08)'}`,
          fontSize: 11,
          color: '#666',
        }}>
          {trust.includes('shipping') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              Frete grátis acima de R$ 500
            </span>
          )}
          {trust.includes('warranty') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z" />
              Garantia 12 meses
            </span>
          )}
          {trust.includes('returns') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M3 12a9 9 0 1 0 9-9M3 4v5h5" />
              Troca em 30 dias
            </span>
          )}
          {trust.includes('payment') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon d="M2 10h20M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
              Pix, cartão até 12×
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
