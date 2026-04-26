'use client';

import { useState } from 'react';

/**
 * VariantPicker — chips de variantes específicos por tipo de joia.
 *
 * Tipos suportados (jewelry-v1):
 *  - anel    → chips de aro 12..22 (8 valores) + link "como medir aro?"
 *  - colar   → chips 40/45/50/55/60 cm
 *  - brinco  → chips Tarraxa / Argola / Inglês
 *
 * Detecção do tipo (em ordem):
 *  1) customFields.tipo / .kind / .category / .categoria (case-insensitive)
 *  2) heurística pelo slug do produto (prefixo "anel-", "colar-", "brinco-")
 *  3) fallback: select genérico construído a partir de optionValues das variantes
 *
 * Preserva o sistema de variants existente: o que muda é apenas a UI —
 * cada chip mapeia para uma variante real (productVariants.optionValues)
 * casando pelo valor relevante (aro, comprimento, fecho).
 *
 * Se não houver variante real correspondente ao chip, ele aparece desabilitado.
 */

export interface VariantPickerVariant {
  id: string;
  sku: string;
  name?: string | null;
  priceCents?: number | null;
  stockQty: number;
  optionValues: Record<string, unknown>;
}

interface VariantPickerProps {
  productSlug: string;
  customFields: Record<string, unknown>;
  variants: VariantPickerVariant[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
}

type JewelryKind = 'anel' | 'colar' | 'brinco' | 'unknown';

const RING_SIZES = ['12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'];
const NECKLACE_SIZES = ['40', '45', '50', '55', '60'];
const EARRING_CLOSURES: Array<{ id: string; label: string }> = [
  { id: 'tarraxa', label: 'Tarraxa' },
  { id: 'argola', label: 'Argola' },
  { id: 'ingles', label: 'Inglês' },
];

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim().toLowerCase();
  }
  return null;
}

export function detectJewelryKind(
  productSlug: string,
  customFields: Record<string, unknown>,
): JewelryKind {
  const fromCustom = pickString(customFields, ['tipo', 'kind', 'category', 'categoria', 'type']);
  const slug = (productSlug ?? '').toLowerCase();

  const matches = (s: string | null, ...needles: string[]) =>
    !!s && needles.some(n => s.includes(n));

  // Brinco antes de anel — "earring" contém "ring" e brinco é mais específico
  if (matches(fromCustom, 'brinco', 'earring')) return 'brinco';
  if (matches(fromCustom, 'colar', 'corrente', 'gargantilha', 'necklace', 'choker'))
    return 'colar';
  if (matches(fromCustom, 'anel', 'aliança', 'alianca', 'ring')) return 'anel';

  if (slug.startsWith('anel-') || slug.startsWith('alianca-') || slug.startsWith('aliança-'))
    return 'anel';
  if (slug.startsWith('colar-') || slug.startsWith('corrente-') || slug.startsWith('gargantilha-'))
    return 'colar';
  if (slug.startsWith('brinco-') || slug.startsWith('brincos-')) return 'brinco';

  if (slug.includes('-anel-') || slug.includes('-aliança-') || slug.includes('-alianca-'))
    return 'anel';
  if (slug.includes('-colar-') || slug.includes('-corrente-')) return 'colar';
  if (slug.includes('-brinco-')) return 'brinco';

  return 'unknown';
}

function pickOptionValue(v: VariantPickerVariant, keys: string[]): string | null {
  for (const k of keys) {
    const raw = v.optionValues?.[k];
    if (raw === undefined || raw === null) continue;
    return String(raw).trim();
  }
  return null;
}

function findVariantByValue(
  variants: VariantPickerVariant[],
  keys: string[],
  value: string,
): VariantPickerVariant | undefined {
  const target = value.toLowerCase();
  return variants.find(v => {
    const got = pickOptionValue(v, keys);
    if (!got) return false;
    return got.toLowerCase() === target;
  });
}

const chipBase = (active: boolean, disabled: boolean): React.CSSProperties => ({
  padding: '10px 14px',
  fontSize: 13,
  cursor: disabled ? 'not-allowed' : 'pointer',
  borderRadius: 4,
  background: 'var(--surface)',
  color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
  textDecoration: disabled ? 'line-through' : 'none',
  border: `${active ? 1.5 : 1}px solid ${active ? 'var(--text-primary)' : 'var(--divider)'}`,
  fontFamily: 'var(--font-body)',
  opacity: disabled ? 0.55 : 1,
});

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function HowToMeasureModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Como medir o aro"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,22,18,0.45)',
        zIndex: 60,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 8,
          maxWidth: 480,
          width: '100%',
          padding: 28,
          boxShadow: '0 24px 60px rgba(26,22,18,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 22 }}>Como medir seu aro</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', padding: 4 }}
          >
            ×
          </button>
        </div>
        <ol style={{ paddingLeft: 18, margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <li>Pegue uma fita de papel fina e enrole no dedo indicado.</li>
          <li>Marque o ponto onde a fita encontra a outra ponta.</li>
          <li>Meça em milímetros (mm) e divida por π (3,14).</li>
          <li>O número resultante é o seu <strong>aro</strong>. Em dúvida, escolha o tamanho maior.</li>
        </ol>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Dica: meça no fim do dia, com o dedo "quente". Evite medir com frio ou após exercícios.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              border: '1px solid var(--text-primary)',
              background: 'var(--text-primary)',
              color: 'var(--text-on-dark)',
              cursor: 'pointer',
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

export function VariantPicker({
  productSlug,
  customFields,
  variants,
  selectedVariantId,
  onSelect,
}: VariantPickerProps) {
  const kind = detectJewelryKind(productSlug, customFields);
  const [howToOpen, setHowToOpen] = useState(false);

  // Para cada tipo: chave(s) de opção esperada(s) e label
  const config: Record<
    Exclude<JewelryKind, 'unknown'>,
    { label: string; optionKeys: string[]; chips: Array<{ value: string; label: string }> }
  > = {
    anel: {
      label: 'Aro',
      optionKeys: ['aro', 'tamanho', 'size', 'ring_size'],
      chips: RING_SIZES.map(v => ({ value: v, label: v })),
    },
    colar: {
      label: 'Comprimento da corrente',
      optionKeys: ['comprimento', 'length', 'tamanho', 'size'],
      chips: NECKLACE_SIZES.map(v => ({ value: v, label: `${v} cm` })),
    },
    brinco: {
      label: 'Tipo de fecho',
      optionKeys: ['fecho', 'closure', 'tipo_fecho', 'tipo'],
      chips: EARRING_CLOSURES.map(c => ({ value: c.id, label: c.label })),
    },
  };

  if (kind === 'unknown') {
    // Fallback: select genérico
    if (variants.length <= 1) return null;
    return (
      <div style={{ marginTop: 24 }}>
        <Label>Opção</Label>
        <select
          value={selectedVariantId}
          onChange={e => onSelect(e.target.value)}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '12px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--divider)',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-primary)',
          }}
        >
          {variants.map(v => {
            const label = Object.values(v.optionValues ?? {}).join(' / ') || v.sku;
            return (
              <option key={v.id} value={v.id} disabled={v.stockQty <= 0}>
                {String(label)}
                {v.stockQty <= 0 ? ' · esgotado' : ''}
              </option>
            );
          })}
        </select>
      </div>
    );
  }

  const cfg = config[kind];

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label>{cfg.label}</Label>
        {kind === 'anel' && (
          <button
            type="button"
            onClick={() => setHowToOpen(true)}
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              borderBottom: '1px solid currentColor',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            Como medir meu aro?
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {cfg.chips.map(chip => {
          const matched = findVariantByValue(variants, cfg.optionKeys, chip.value);
          const disabled = !matched || matched.stockQty <= 0;
          const active = matched ? matched.id === selectedVariantId : false;
          return (
            <button
              key={chip.value}
              type="button"
              disabled={disabled}
              onClick={() => matched && onSelect(matched.id)}
              style={chipBase(active, disabled)}
              aria-pressed={active}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      {kind === 'anel' && <HowToMeasureModal open={howToOpen} onClose={() => setHowToOpen(false)} />}
    </div>
  );
}
