'use client';

/**
 * ShippingCalc — calculadora inline de prazo/frete na PDP.
 *
 * Modo degradado por design (CLAUDE.md "modo degradado"):
 *  - Sempre que API real falhar ou não existir, mostra estimativa textual
 *  - Lookup ViaCEP (já usado no checkout) confirma cidade/UF antes de estimar
 *  - Free-shipping threshold (R$ 500) reflete a regra de negócio atual
 *  - Sem novas migrations, sem novo contract de API: integração futura com
 *    Melhor Envio fica como TODO sinalizado em comentário
 *
 * Acessibilidade:
 *  - Form com label associado
 *  - aria-live="polite" para anunciar resultado
 *  - Não bloqueia tab order do CTA principal (vem depois de Add to cart)
 */

import { useId, useState } from 'react';
import { Icon } from '../../../components/ui/icon';

interface ShippingCalcProps {
  priceCents: number;
  currency: string;
  freeShippingThresholdCents?: number;
}

interface CepLookupResult {
  cep: string;
  city: string;
  uf: string;
}

interface ShippingOption {
  carrier: string;
  service: string;
  daysMin: number;
  daysMax: number;
  priceCents: number | null; // null = grátis
}

async function lookupCep(rawCep: string): Promise<CepLookupResult | null> {
  const clean = rawCep.replace(/\D/g, '');
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const json = (await res.json()) as { cep?: string; localidade?: string; uf?: string; erro?: boolean };
    if (json.erro || !json.localidade || !json.uf) return null;
    return { cep: json.cep ?? clean, city: json.localidade, uf: json.uf };
  } catch {
    return null;
  }
}

/**
 * Estimativa local de prazo (modo degradado, sem dependência de API externa).
 * TODO: substituir por chamada real ao Melhor Envio quando integração estiver pronta.
 * Heurística simples por região para refletir realidade brasileira.
 */
function estimateOptions(uf: string, productPriceCents: number, threshold: number): ShippingOption[] {
  const region = regionFromUf(uf);
  const baseDays = region === 'SE' ? [3, 5] : region === 'S' || region === 'CO' ? [4, 7] : [6, 10];
  const sedex = region === 'SE' ? [1, 3] : region === 'S' || region === 'CO' ? [2, 4] : [4, 7];
  const free = productPriceCents >= threshold;
  return [
    {
      carrier: 'Correios PAC',
      service: 'Padrão',
      daysMin: baseDays[0]!,
      daysMax: baseDays[1]!,
      priceCents: free ? null : region === 'SE' ? 1990 : 2990,
    },
    {
      carrier: 'Correios SEDEX',
      service: 'Expressa',
      daysMin: sedex[0]!,
      daysMax: sedex[1]!,
      priceCents: region === 'SE' ? 3490 : 4990,
    },
  ];
}

function regionFromUf(uf: string): 'SE' | 'S' | 'CO' | 'NE' | 'N' {
  const map: Record<string, 'SE' | 'S' | 'CO' | 'NE' | 'N'> = {
    SP: 'SE', RJ: 'SE', MG: 'SE', ES: 'SE',
    RS: 'S', SC: 'S', PR: 'S',
    DF: 'CO', GO: 'CO', MT: 'CO', MS: 'CO',
    BA: 'NE', PE: 'NE', CE: 'NE', RN: 'NE', PB: 'NE', AL: 'NE', SE: 'NE', MA: 'NE', PI: 'NE',
    AM: 'N', PA: 'N', AC: 'N', RO: 'N', RR: 'N', AP: 'N', TO: 'N',
  };
  return map[uf.toUpperCase()] ?? 'NE';
}

function formatCurrency(cents: number, currency: string) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency });
}

export function ShippingCalc({ priceCents, currency, freeShippingThresholdCents = 50000 }: ShippingCalcProps) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ city: string; uf: string; options: ShippingOption[] } | null>(null);
  const inputId = useId();

  const formatCep = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, 8);
    if (clean.length <= 5) return clean;
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) {
      setError('Informe um CEP válido (8 dígitos).');
      return;
    }
    setLoading(true);
    const lookup = await lookupCep(cep);
    setLoading(false);
    if (!lookup) {
      setError('Não conseguimos localizar este CEP. Tente novamente.');
      return;
    }
    const options = estimateOptions(lookup.uf, priceCents, freeShippingThresholdCents);
    setResult({ city: lookup.city, uf: lookup.uf, options });
  }

  return (
    <div
      style={{
        marginTop: 28,
        padding: 18,
        background: 'var(--surface)',
        borderRadius: 8,
        border: '1px solid var(--divider)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="truck" size={16} style={{ color: 'var(--accent)' }} />
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Calcular prazo e frete
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <label htmlFor={inputId} style={{ position: 'absolute', left: -9999 }}>
          CEP
        </label>
        <input
          id={inputId}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={cep}
          maxLength={9}
          onChange={(e) => setCep(formatCep(e.target.value))}
          style={{
            flex: 1,
            padding: '12px 14px',
            fontSize: 14,
            fontFamily: 'var(--font-body)',
            background: 'var(--bg, #fff)',
            border: '1px solid var(--divider)',
            borderRadius: 6,
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '12px 18px',
            fontSize: 13,
            fontWeight: 500,
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--text-primary)',
            borderRadius: 6,
            cursor: loading ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Buscando…' : 'Calcular'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          style={{ margin: '10px 0 0', fontSize: 12, color: '#A84444' }}
        >
          {error}
        </p>
      )}

      {result && (
        <div aria-live="polite" style={{ marginTop: 14 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>
            Entrega para <strong style={{ color: 'var(--text-primary)' }}>{result.city} · {result.uf}</strong>
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.options.map((opt) => (
              <li
                key={`${opt.carrier}-${opt.service}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--divider)',
                  fontSize: 13,
                }}
              >
                <span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{opt.carrier}</span>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>· {opt.daysMin}–{opt.daysMax} dias úteis</span>
                </span>
                <span style={{
                  color: opt.priceCents === null ? 'var(--success, #4A8A3F)' : 'var(--text-primary)',
                  fontWeight: opt.priceCents === null ? 600 : 500,
                }}>
                  {opt.priceCents === null ? 'Grátis' : formatCurrency(opt.priceCents, currency)}
                </span>
              </li>
            ))}
          </ul>
          <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
            Estimativa baseada em região. Valor final calculado no checkout.
          </p>
        </div>
      )}
    </div>
  );
}
