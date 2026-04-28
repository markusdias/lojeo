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
  slogan?: string;
  tagline?: string;
}

// Match jewelry-v1 tokens.css SOT
const TONE_BG: Record<string, string> = {
  warm: '#FAFAF6',
  pure: '#FFFFFF',
  cool: '#F7F8FA',
  cream: '#F5EFE3',
};

// --surface-sunken por data-bg-tone — valores exatos do tokens.css
const TONE_SURFACE_SUNKEN: Record<string, string> = {
  warm: '#F4F1E9',
  pure: '#F5F5F5',
  cool: '#EEF0F3',
  cream: '#EBE3D2',
};

const ACCENT_HEX: Record<string, string> = {
  champagne: '#B8956A',
  silver: '#9AA0A6',
  'rose-gold': '#C8A28C',
  copper: '#A96B3F',
  'noir-rose': '#5C3A3F',
};

// --accent-soft valores exatos do tokens.css (não hex+alpha aproximado)
const ACCENT_SOFT: Record<string, string> = {
  champagne: '#F2EAD9',
  silver: '#ECEEF1',
  'rose-gold': '#F4E7DD',
  copper: '#F0DDCD',
  'noir-rose': '#ECDBDD',
};

// size: 1 para todos os combos — tokens.css não reduz escala global por combo
// (combo C usa font-feature-settings, não font-size menor)
const TYPE_FAMILIES: Record<string, { display: string; body: string; weight: number; size: number }> = {
  a: { display: '"Cormorant Garamond","Cormorant",Georgia,serif', body: 'Inter,system-ui,sans-serif', weight: 500, size: 1 },
  b: { display: '"Playfair Display",Georgia,serif', body: '"Source Sans 3",system-ui,sans-serif', weight: 500, size: 1 },
  c: { display: 'Inter,system-ui,sans-serif', body: '"JetBrains Mono",ui-monospace,monospace', weight: 600, size: 1 },
};

const RADIUS: Record<string, string> = { '0': '0', '8': '8px', '16': '16px' };

const SCALE_FACTOR: Record<string, number> = { smaller: 0.85, default: 1, larger: 1.15 };

/**
 * StorefrontPreview — mockup estático coerente com config (typo/accent/bgTone/imgRadius/hero/photoStyle/trust).
 * Match Appearance.jsx ref. Não é iframe live — é preview curado que reflete instantaneamente
 * mudanças nos controles (sem rebuild do storefront real).
 */
export function StorefrontPreview({ config }: { config: PreviewConfig }) {
  const bgToneKey = config.bgTone ?? 'warm';
  const bg = TONE_BG[bgToneKey] ?? '#FAFAF6';
  const surfaceSunken = TONE_SURFACE_SUNKEN[bgToneKey] ?? '#F4F1E9';
  const accentKey = config.accent ?? 'champagne';
  const accent = ACCENT_HEX[accentKey] ?? '#B8956A';
  const accentSoft = ACCENT_SOFT[accentKey] ?? '#F2EAD9';
  const baseT = TYPE_FAMILIES[config.typo ?? 'a'] ?? TYPE_FAMILIES.a!;
  const scaleFactor = SCALE_FACTOR[config.typeScale ?? 'default'] ?? 1;
  const t = { ...baseT, size: baseT.size * scaleFactor };
  const radius = RADIUS[config.imgRadius ?? '8'] ?? '8px';
  const hero = config.hero ?? 'image';
  const trust = config.trustSignals ?? ['shipping', 'warranty', 'returns', 'payment'];
  const slogan = config.slogan?.trim() || 'Peças que ficam.';
  const tagline = config.tagline?.trim() || 'Joalheria contemporânea, finalizada à mão.';

  return (
    <div style={{ background: bg, fontFamily: t.body, padding: 'clamp(12px, 2vw, 20px)', minHeight: '100%', color: '#1A1A1A' }}>
      {/* Top nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 'clamp(12px, 1.5vw, 18px)',
        borderBottom: '1px solid #E8E2D5',
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

      {/* Hero — replica storefront real:
           - bg gradient: accent-soft → accent (sutil, sente cor da marca)
           - eyebrow: accent (destaque)
           - h1 preto (text-primary)
           - CTA primário: accent fill, secundário border preto */}
      {(hero === 'image' || hero === 'video') && (
        <div style={{
          position: 'relative', aspectRatio: '16/9',
          background: `linear-gradient(135deg, ${accentSoft} 0%, ${accentSoft} 40%, ${accent} 160%)`,
          borderRadius: radius, overflow: 'hidden',
          marginBottom: 'clamp(28px, 4vw, 48px)',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.45) 50%, rgba(255,255,255,0) 75%)',
          }} />
          <div style={{
            position: 'absolute', left: 'clamp(20px, 5vw, 56px)',
            top: '50%', transform: 'translateY(-50%)',
            maxWidth: 320,
          }}>
            <p style={{ color: accent, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 500 }}>
              Coleção · Outono &apos;26
            </p>
            <h2 style={{
              fontFamily: t.display,
              fontWeight: t.weight,
              fontSize: `${28 * t.size}px`,
              lineHeight: 1.05,
              margin: '0 0 12px',
              letterSpacing: '-0.01em',
              color: '#1A1612',
            }}>
              {slogan}
            </h2>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: '#3A332C', marginBottom: 16, maxWidth: 280 }}>
              {tagline}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{
                padding: '8px 16px',
                background: accent,
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: radius,
              }}>
                Ver coleção
              </span>
              <span style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#1A1612',
                border: '1px solid #1A1612',
                fontSize: 11,
                fontWeight: 500,
                borderRadius: radius,
              }}>
                Nossa história
              </span>
            </div>
          </div>
          {hero === 'video' && (
            <div style={{
              position: 'absolute', top: 12, right: 12,
              padding: '4px 10px',
              background: 'rgba(0,0,0,0.4)', color: '#fff',
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              borderRadius: 999,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span aria-hidden style={{ width: 0, height: 0, borderLeft: '5px solid #fff', borderTop: '3px solid transparent', borderBottom: '3px solid transparent' }} />
              Vídeo
            </div>
          )}
        </div>
      )}

      {hero === 'carousel' && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ aspectRatio: '21/9', background: 'linear-gradient(135deg, #E8DDC9 0%, #D4C5A8 100%)', borderRadius: radius }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{ width: 24, height: 2, background: i === 1 ? accent : '#ccc' }} />
            ))}
          </div>
        </div>
      )}

      {hero === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
          {[
            'linear-gradient(135deg, #EDE3CE 0%, #D4C5A8 100%)',
            'linear-gradient(135deg, #F2EAD8 0%, #D8C9AC 100%)',
            'linear-gradient(135deg, #E8DCC2 0%, #C9B894 100%)',
          ].map((tone, i) => (
            <div key={i} style={{ aspectRatio: '3/4', background: tone, borderRadius: radius }} />
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

      {/* Product grid 4-up — placeholder visual alinhado ao storefront real (ProductCard).
         Quando photoStyle muda, o gradient do placeholder muda por modo (mesmas regras
         de globals.css: isolated/lifestyle/mix). */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(8px, 1vw, 14px)', marginBottom: 'clamp(28px, 3vw, 40px)' }}>
        {[
          { name: 'Anel Solitário Ouro 18k', price: 'R$ 2.490' },
          { name: 'Brinco Pérola Prata 950', price: 'R$ 380' },
          { name: 'Pulseira Veneziana', price: 'R$ 920' },
          { name: 'Colar Elo Cartier', price: 'R$ 1.640' },
        ].map(p => {
          const photo = config.photoStyle ?? 'isolated';
          const placeholderBg =
            photo === 'lifestyle' ? 'linear-gradient(140deg, #C9B894 0%, #6B5740 60%, #3A2E22 100%)' :
            photo === 'mix' ? 'linear-gradient(135deg, #EDE8DE 0%, #EDE8DE 50%, #C9B894 50%, #6B5740 100%)' :
            'linear-gradient(135deg, #EDE8DE 0%, #D8D0C0 100%)';
          const svgStroke = photo === 'lifestyle' ? 'rgba(255,255,255,0.7)' : '#A89B8C';
          return (
            <div key={p.name}>
              <div style={{
                aspectRatio: '3/4',
                background: placeholderBg,
                borderRadius: radius,
                marginBottom: 8,
                position: 'relative',
                overflow: 'hidden',
                display: 'grid',
                placeItems: 'center',
              }}>
                <svg width="40%" height="40%" viewBox="0 0 24 24" fill="none" stroke={svgStroke} strokeWidth="1" aria-hidden>
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M8 8a4 4 0 0 1 8 0"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
              <p style={{ fontFamily: t.display, fontSize: 13, fontWeight: t.weight, lineHeight: 1.3, marginBottom: 2 }}>
                {p.name}
              </p>
              <p style={{ fontSize: 12, color: '#555' }}>{p.price}</p>
            </div>
          );
        })}
      </div>

      {/* Trust signals — icons usam accent (match storefront real onde icon ganha var(--accent)) */}
      {trust.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 'clamp(12px, 2vw, 24px)',
          flexWrap: 'wrap',
          paddingTop: 'clamp(16px, 2vw, 24px)',
          borderTop: '1px solid #E8E2D5',
          fontSize: 11,
          color: '#666',
        }}>
          {trust.includes('shipping') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              <span style={{ color: '#666' }}>Frete grátis acima de R$ 500</span>
            </span>
          )}
          {trust.includes('warranty') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M9 12l2 2 4-4M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z" />
              <span style={{ color: '#666' }}>Garantia 12 meses</span>
            </span>
          )}
          {trust.includes('returns') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M3 12a9 9 0 1 0 9-9M3 4v5h5" />
              <span style={{ color: '#666' }}>Troca em 30 dias</span>
            </span>
          )}
          {trust.includes('payment') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M2 10h20M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
              <span style={{ color: '#666' }}>Pix, cartão até 12×</span>
            </span>
          )}
          {trust.includes('secure') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M4 11h16v10H4zM8 11V7a4 4 0 1 1 8 0v4" />
              <span style={{ color: '#666' }}>Site seguro</span>
            </span>
          )}
          {trust.includes('rating') && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: accent }}>
              <Icon d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z" />
              <span style={{ color: '#666' }}>Avaliação 4.8★</span>
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
