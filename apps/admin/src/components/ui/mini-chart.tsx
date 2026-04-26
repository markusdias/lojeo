'use client';

/**
 * Mini-charts SVG puros — sem dependências externas.
 *
 * Suporta: bar (vertical), line (com pontos), funnel (etapas).
 * Cores via tokens design system Lojeo (var(--accent), var(--neutral-*)).
 */

interface DataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  data: DataPoint[];
  height?: number;
  width?: number;
  color?: string;
  format?: (n: number) => string;
}

const DEFAULT_FORMAT = (n: number) => n.toLocaleString('pt-BR');

export function MiniBarChart({
  data, height = 200, width = 600, color = 'var(--accent)', format = DEFAULT_FORMAT,
}: ChartProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barW = (chartW / data.length) * 0.7;
  const gap = (chartW / data.length) * 0.3;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de barras">
      {/* Y axis ticks */}
      {[0, 0.5, 1].map(t => {
        const y = padding.top + (1 - t) * chartH;
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeDasharray="2,4" />
            <text x={padding.left - 8} y={y + 4} fontSize="11" fill="var(--fg-secondary)" textAnchor="end">
              {format(max * t)}
            </text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = padding.left + i * (barW + gap) + gap / 2;
        const y = padding.top + (chartH - h);
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={color} rx={2} />
            <text x={x + barW / 2} y={height - padding.bottom + 16} fontSize="10" fill="var(--fg-secondary)" textAnchor="middle">
              {d.label.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MiniLineChart({
  data, height = 200, width = 600, color = 'var(--accent)', format = DEFAULT_FORMAT,
}: ChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const stepX = chartW / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + chartH - ((d.value - min) / (max - min || 1)) * chartH;
    return { x, y, value: d.value, label: d.label };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de linha">
      {[0, 0.5, 1].map(t => {
        const y = padding.top + (1 - t) * chartH;
        const tickValue = min + (max - min) * t;
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeDasharray="2,4" />
            <text x={padding.left - 8} y={y + 4} fontSize="11" fill="var(--fg-secondary)" textAnchor="end">
              {format(tickValue)}
            </text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}
      {/* Apenas 1ª e última labels para não poluir */}
      <text x={points[0]!.x} y={height - padding.bottom + 16} fontSize="10" fill="var(--fg-secondary)" textAnchor="start">
        {points[0]!.label.slice(0, 10)}
      </text>
      <text x={points[points.length - 1]!.x} y={height - padding.bottom + 16} fontSize="10" fill="var(--fg-secondary)" textAnchor="end">
        {points[points.length - 1]!.label.slice(0, 10)}
      </text>
    </svg>
  );
}

export function MiniFunnelChart({
  data, height = 240, width = 600, format = DEFAULT_FORMAT,
}: ChartProps) {
  if (data.length === 0) return null;
  const max = data[0]!.value || 1;
  const padding = { top: 8, right: 16, bottom: 8, left: 8 };
  const chartW = width - padding.left - padding.right;
  const stageH = (height - padding.top - padding.bottom) / data.length;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico funil">
      {data.map((d, i) => {
        const w = (d.value / max) * chartW;
        const x = padding.left + (chartW - w) / 2;
        const y = padding.top + i * stageH;
        const conv = i > 0 && data[i - 1] && data[i - 1]!.value > 0
          ? (d.value / data[i - 1]!.value) * 100
          : 100;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y + 4}
              width={w}
              height={stageH - 8}
              fill={i === 0 ? 'var(--info)' : i === data.length - 1 ? 'var(--success)' : 'var(--accent)'}
              rx={2}
            />
            <text x={width / 2} y={y + stageH / 2 + 4} fontSize="12" fill="white" textAnchor="middle" fontWeight="600">
              {d.label}: {format(d.value)}
              {i > 0 && ` (${conv.toFixed(0)}%)`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Sparkline — linha minúscula inline, sem axes/labels.
 * Para uso em metric cards (acompanha número grande, indica tendência).
 */
export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = 'var(--accent)',
  fill,
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - min) / range) * height,
  }));

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fillD = `${lineD} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden role="img">
      {fill && <path d={fillD} fill={fill} />}
      <path d={lineD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
