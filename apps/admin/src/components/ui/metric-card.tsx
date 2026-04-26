/**
 * MetricCard — card de métrica reutilizável.
 *
 * Spec base: docs/design-system/project/preview/components-metric-cards.html
 * Tokens: lj-card, var(--text-h2), Sparkline opcional, delta tipado.
 *
 * Variantes:
 *  - accent: card de destaque (positivo, lucro, receita)
 *  - warning: tom de alerta (estoque baixo, churn alto)
 *  - default: neutro
 *
 * Pode ser link (href) ou apenas display (sem href).
 */

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Sparkline } from './mini-chart';

export interface MetricDelta {
  /** texto pré-formatado (ex: '+12,4%' ou 'novo' ou '—') */
  text: string;
  /** true=verde▲, false=vermelho▼, null=oculto */
  up: boolean | null;
}

export interface MetricCardProps {
  label: string;
  value: string;
  delta?: MetricDelta;
  sparkData?: number[];
  /** verde Lojeo — usado em receita / KPIs positivos */
  accent?: boolean;
  /** laranja — usado em alertas leves */
  warning?: boolean;
  /** vermelho — usado em alertas críticos */
  danger?: boolean;
  /** se houver, card vira <Link> clicável */
  href?: string;
  /** ícone opcional renderizado à esquerda do label */
  icon?: ReactNode;
  /**
   * Estilo do label.
   * - `eyebrow` (default, legado): UPPERCASE tracking-wide caption.
   * - `normal`: case normal, body-s peso medium — usado no dashboard
   *   conforme design oficial Claude Design (ex: "Receita hoje").
   */
  labelStyle?: 'eyebrow' | 'normal';
}

function DeltaChip({ delta }: { delta: MetricDelta }) {
  if (delta.up === null) return null;
  const color = delta.up ? 'var(--success)' : 'var(--error)';
  const arrow = delta.up ? '▲' : '▼';
  return (
    <span
      className="numeric"
      style={{
        fontSize: 'var(--text-caption)',
        color,
        fontWeight: 'var(--w-medium)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {arrow} {delta.text}
    </span>
  );
}

function tone(props: Pick<MetricCardProps, 'accent' | 'warning' | 'danger'>): string {
  if (props.danger) return 'var(--error)';
  if (props.warning) return 'var(--warning)';
  if (props.accent) return 'var(--fg)';
  return 'var(--fg)';
}

export function MetricCard(props: MetricCardProps) {
  const { label, value, delta, sparkData, href, icon, accent, warning, danger, labelStyle = 'eyebrow' } = props;
  const valueColor = tone({ accent, warning, danger });
  const labelColor = warning ? 'var(--warning)' : danger ? 'var(--error)' : undefined;
  const sparkColor = warning ? 'var(--warning)' : danger ? 'var(--error)' : 'var(--accent)';

  const labelClass = labelStyle === 'eyebrow' ? 'eyebrow' : 'body-s';
  const labelExtraStyle = labelStyle === 'normal'
    ? { fontWeight: 'var(--w-medium)', color: labelColor ?? 'var(--fg)', lineHeight: 1.25 }
    : { color: labelColor };

  const inner = (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
        <p
          className={labelClass}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            margin: 0,
            ...labelExtraStyle,
          }}
        >
          {icon && <span aria-hidden>{icon}</span>}
          {label}
        </p>
        {delta && <DeltaChip delta={delta} />}
      </div>
      <p
        className="numeric"
        style={{
          fontSize: 'var(--text-h2)',
          fontWeight: 'var(--w-semibold)',
          letterSpacing: 'var(--track-tight)',
          color: valueColor,
          margin: 0,
        }}
      >
        {value}
      </p>
      {sparkData && sparkData.length >= 2 && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <Sparkline
            values={sparkData.some(v => v > 0) ? sparkData : new Array(sparkData.length).fill(1)}
            width={220}
            height={28}
            color={sparkData.some(v => v > 0) ? sparkColor : 'var(--neutral-100)'}
            fill={accent && sparkData.some(v => v > 0) ? 'rgba(0, 85, 61, 0.08)' : undefined}
          />
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="lj-card"
        style={{
          padding: 'var(--space-5)',
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          transition: 'box-shadow var(--dur-fast) var(--ease-out, ease-out)',
        }}
      >
        {inner}
      </Link>
    );
  }
  return <div className="lj-card" style={{ padding: 'var(--space-5)' }}>{inner}</div>;
}
