/**
 * RevenueWeekChart — gráfico "Receita · últimos 7 dias" do dashboard.
 *
 * Espelha o design oficial Claude Design (Dashboard.jsx, screenshot
 * `docs/design-system/project/screenshots/admin-dashboard.png`):
 *  - área verde com gradient (esta semana)
 *  - linha tracejada cinza (semana anterior, comparativo)
 *  - 4 grid lines horizontais sutis
 *  - viewBox 600×180, escala fluida via preserveAspectRatio="none"
 *
 * SVG inline puro — sem libs externas, server-renderable
 * (sem `'use client'`, sem hooks). Tokens via `var(--*)` quando possível;
 * algumas cores ficam hard-coded (#00553D, #A3A3A3) pois SVG dentro de
 * `polyline stroke=...` aceita literal — mantemos consistentes com o
 * design ground-truth.
 */

interface RevenueWeekChartProps {
  /** valores em cents, mais antigo → mais recente, exatamente 7 entradas */
  current: number[];
  /** comparativo da semana anterior, mesma cardinalidade */
  previous: number[];
  /** altura do SVG em px (default 200) */
  height?: number;
}

const VIEW_W = 600;
const VIEW_H = 180;

function pointsString(values: number[], maxAll: number): string {
  if (values.length < 2) return '';
  const stepX = VIEW_W / (values.length - 1);
  const range = maxAll || 1;
  return values
    .map((v, i) => {
      const x = i * stepX;
      // 16px top padding, 20px bottom padding pra não colar nos eixos
      const y = 16 + (1 - v / range) * (VIEW_H - 36);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function areaPath(values: number[], maxAll: number): string {
  if (values.length < 2) return '';
  const stepX = VIEW_W / (values.length - 1);
  const range = maxAll || 1;
  const top = values
    .map((v, i) => {
      const x = i * stepX;
      const y = 16 + (1 - v / range) * (VIEW_H - 36);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return `${top} L ${VIEW_W} ${VIEW_H} L 0 ${VIEW_H} Z`;
}

export function RevenueWeekChart({ current, previous, height = 200 }: RevenueWeekChartProps) {
  const allValues = [...current, ...previous];
  const max = Math.max(...allValues, 1);
  const hasData = allValues.some(v => v > 0);

  // Quando não há nenhum dado, geramos uma curva "esqueleto" plana
  // pra preservar a forma visual do card sem mentir ao lojista.
  const safeCurrent = hasData ? current : new Array(7).fill(0);
  const safePrevious = hasData ? previous : new Array(7).fill(0);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label="Receita dos últimos 7 dias comparada com a semana anterior"
    >
      <defs>
        <linearGradient id="revenue-week-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00553D" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#00553D" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid lines horizontais sutis */}
      {[40, 80, 120, 160].map(y => (
        <line key={y} x1={0} y1={y} x2={VIEW_W} y2={y} stroke="var(--neutral-50, #F5F5F5)" strokeWidth={1} />
      ))}

      {hasData && (
        <>
          <path d={areaPath(safeCurrent, max)} fill="url(#revenue-week-grad)" />
          <polyline
            points={pointsString(safeCurrent, max)}
            fill="none"
            stroke="#00553D"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={pointsString(safePrevious, max)}
            fill="none"
            stroke="#A3A3A3"
            strokeWidth={1.5}
            strokeDasharray="3 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
