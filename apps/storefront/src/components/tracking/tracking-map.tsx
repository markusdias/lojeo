/**
 * TrackingMap — mapa SVG branded para rastreamento de pedido.
 *
 * Match docs/design-system-jewelry-v1/project/ui_kits/storefront/Account.jsx Tracking section:
 * - Pattern dotmap (pontilhado bege opacity 0.4)
 * - Path arc dashed entre 2 cidades
 * - Circle origem (preto fill)
 * - Circle destino (white fill com border preto)
 * - Labels city names
 *
 * Sem coordenadas reais — aproximação por estado UF mapeado em viewBox 800x350.
 */

interface Props {
  origin: { city: string; state?: string };
  destination: { city?: string; state?: string };
}

// Coordenadas aproximadas de capitais BR no viewBox 800x350 (ordem horizontal por longitude)
const STATE_COORDS: Record<string, { x: number; y: number; city: string }> = {
  AM: { x: 110, y: 110, city: 'Manaus' },
  PA: { x: 220, y: 100, city: 'Belém' },
  CE: { x: 580, y: 90, city: 'Fortaleza' },
  PE: { x: 620, y: 130, city: 'Recife' },
  BA: { x: 540, y: 175, city: 'Salvador' },
  GO: { x: 380, y: 195, city: 'Goiânia' },
  DF: { x: 410, y: 195, city: 'Brasília' },
  MG: { x: 470, y: 220, city: 'Belo Horizonte' },
  MT: { x: 290, y: 195, city: 'Cuiabá' },
  MS: { x: 290, y: 245, city: 'Campo Grande' },
  ES: { x: 540, y: 235, city: 'Vitória' },
  SP: { x: 410, y: 260, city: 'São Paulo' },
  RJ: { x: 510, y: 260, city: 'Rio de Janeiro' },
  PR: { x: 360, y: 285, city: 'Curitiba' },
  SC: { x: 380, y: 310, city: 'Florianópolis' },
  RS: { x: 320, y: 330, city: 'Porto Alegre' },
};

function lookup(loc: { city?: string; state?: string }): { x: number; y: number; city: string } {
  if (loc.state && STATE_COORDS[loc.state.toUpperCase()]) {
    const c = STATE_COORDS[loc.state.toUpperCase()]!;
    return { ...c, city: loc.city ?? c.city };
  }
  // Fallback default: SP
  return { x: 410, y: 260, city: loc.city ?? 'Origem' };
}

export function TrackingMap({ origin, destination }: Props) {
  const o = lookup(origin);
  const d = lookup(destination);
  // Bezier control point: midpoint elevado (curva suave)
  const cx = (o.x + d.x) / 2;
  const cy = Math.min(o.y, d.y) - 80;
  const path = `M ${o.x} ${o.y} Q ${cx} ${cy} ${d.x} ${d.y}`;

  return (
    <div style={{
      aspectRatio: '16/7',
      background: '#F4F1E9',
      borderRadius: 6,
      position: 'relative',
      overflow: 'hidden',
      marginTop: 24,
    }}>
      <svg width="100%" height="100%" viewBox="0 0 800 350" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <pattern id="lojeo-dotmap" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="#A89B8C" opacity="0.4" />
          </pattern>
        </defs>
        <rect width="800" height="350" fill="url(#lojeo-dotmap)" />
        <path d={path} stroke="#B8956A" strokeWidth="2" fill="none" strokeDasharray="6 6" />
        {/* Origem (preto fill) */}
        <circle cx={o.x} cy={o.y} r="8" fill="#1A1612" />
        {/* Destino (white fill) */}
        <circle cx={d.x} cy={d.y} r="8" fill="#FFFFFF" stroke="#1A1612" strokeWidth="2" />
        {/* Labels */}
        <text x={o.x} y={o.y + 28} textAnchor="middle" fontSize="11" fill="#6B6055" fontFamily="Inter, system-ui, sans-serif">
          {o.city}
        </text>
        <text x={d.x} y={d.y - 16} textAnchor="middle" fontSize="11" fill="#6B6055" fontFamily="Inter, system-ui, sans-serif">
          {d.city}
        </text>
      </svg>
    </div>
  );
}
