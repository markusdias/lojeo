import type { ReactNode } from 'react';

type Variant = 'image' | 'video' | 'carousel' | 'grid';

export function HeroVariant({ variant, children }: { variant: Variant; children: ReactNode }) {
  if (variant === 'video') {
    return (
      <div style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #1A1A1A 0%, #3A2E22 100%)',
      }}>
        <div aria-hidden style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(184, 149, 106, 0.35) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', top: 16, right: 16,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px',
          background: 'rgba(0,0,0,0.4)',
          color: '#fff',
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          borderRadius: 999,
        }}>
          <span aria-hidden style={{ width: 0, height: 0, borderLeft: '6px solid #fff', borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
          Vídeo
        </div>
        <div style={{
          position: 'absolute', left: 'clamp(24px, 5vw, 80px)',
          top: '50%', transform: 'translateY(-50%)',
          color: '#fff',
        }}>
          {children}
        </div>
      </div>
    );
  }

  if (variant === 'carousel') {
    return (
      <div>
        <div style={{
          position: 'relative', borderRadius: 8, overflow: 'hidden',
          aspectRatio: '21/9',
          background: 'linear-gradient(135deg, #E8DDC9 0%, #D4C5A8 100%)',
        }}>
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(232,221,201,0.92) 0%, rgba(232,221,201,0.4) 50%, rgba(232,221,201,0) 70%)',
          }} />
          <div style={{
            position: 'absolute', left: 'clamp(24px, 5vw, 80px)',
            top: '50%', transform: 'translateY(-50%)',
          }}>
            {children}
          </div>
        </div>
        <div aria-hidden style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 18 }}>
          {[1, 2, 3].map(i => (
            <span key={i} style={{ width: 28, height: 2, background: i === 1 ? 'var(--accent)' : 'var(--divider)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div>
        <div style={{
          padding: '32px clamp(24px, 5vw, 80px) 0',
        }}>
          {children}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginTop: 32,
        }}>
          {[
            'linear-gradient(135deg, #EDE3CE 0%, #D4C5A8 100%)',
            'linear-gradient(135deg, #F2EAD8 0%, #D8C9AC 100%)',
            'linear-gradient(135deg, #E8DCC2 0%, #C9B894 100%)',
          ].map((tone, i) => (
            <div key={i} style={{ aspectRatio: '3/4', background: tone, borderRadius: 'var(--r-image, 8px)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', borderRadius: 'var(--r-image, 8px)', overflow: 'hidden',
      aspectRatio: '16/9',
      background: 'linear-gradient(135deg, var(--accent-soft, #F2EAD9) 0%, var(--accent-soft, #F2EAD9) 40%, var(--accent, #B8956A) 160%)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, var(--surface, #fff) 0%, color-mix(in srgb, var(--surface, #fff) 70%, transparent) 50%, transparent 75%)',
      }} />
      <div style={{
        position: 'absolute', left: 'clamp(24px, 5vw, 80px)',
        top: '50%', transform: 'translateY(-50%)',
      }}>
        {children}
      </div>
    </div>
  );
}
