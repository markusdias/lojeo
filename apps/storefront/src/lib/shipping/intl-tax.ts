// Intl tax/alfândega estimator — exibe aviso ao cliente sobre VAT/duties
// no destino. Tabela hardcoded V1; V2 lookup HS code + per-country rates.
//
// Helper puro (sem fetch). UI consome via component IntlTaxNotice.

export interface IntlTaxEstimate {
  /** Pais destino (ISO-2). */
  toCountry: string;
  /** Tipo principal aplicado (VAT, sales tax, customs duty). */
  taxKind: 'vat' | 'sales_tax' | 'customs' | 'none';
  /** Aliquota aproximada % aplicada sobre subtotal+frete. */
  rateBps: number; // basis points (100 = 1%)
  /** Estimativa em cents (subtotal+frete * rate / 10000). */
  estimatedCents: number;
  /** Copy explicativa pra exibir ao cliente. */
  noticeKey: 'vat_destination' | 'sales_tax_state' | 'customs_destination' | 'none';
  /** Idioma do label. */
  locale: 'pt-BR' | 'en-US';
}

const DEFAULT_RATE_BPS: Record<string, { kind: 'vat' | 'sales_tax' | 'customs'; rate: number }> = {
  // Eurozone VAT (varia 17-27%; usamos 21% como mediana DE/FR/ES)
  DE: { kind: 'vat', rate: 1900 },
  FR: { kind: 'vat', rate: 2000 },
  ES: { kind: 'vat', rate: 2100 },
  IT: { kind: 'vat', rate: 2200 },
  NL: { kind: 'vat', rate: 2100 },
  PT: { kind: 'vat', rate: 2300 },
  BE: { kind: 'vat', rate: 2100 },
  AT: { kind: 'vat', rate: 2000 },
  IE: { kind: 'vat', rate: 2300 },
  // UK
  GB: { kind: 'vat', rate: 2000 },
  // US — sales tax estadual médio (varia 0–10%)
  US: { kind: 'sales_tax', rate: 700 },
  CA: { kind: 'sales_tax', rate: 1300 }, // GST + provincial average
  // BR (importação Brasil) — IPI + ICMS aproximado
  BR: { kind: 'customs', rate: 6000 },
};

export interface IntlTaxInput {
  toCountry: string;
  fromCountry: string;
  subtotalCents: number;
  shippingCents: number;
  locale?: 'pt-BR' | 'en-US';
}

export function estimateIntlTax(input: IntlTaxInput): IntlTaxEstimate {
  const toCountry = input.toCountry.toUpperCase();
  const fromCountry = input.fromCountry.toUpperCase();
  const locale = input.locale ?? 'en-US';

  // Domestico: sem aviso
  if (toCountry === fromCountry) {
    return {
      toCountry,
      taxKind: 'none',
      rateBps: 0,
      estimatedCents: 0,
      noticeKey: 'none',
      locale,
    };
  }

  const entry = DEFAULT_RATE_BPS[toCountry];
  if (!entry) {
    return {
      toCountry,
      taxKind: 'customs',
      rateBps: 0,
      estimatedCents: 0,
      noticeKey: 'customs_destination',
      locale,
    };
  }

  const base = input.subtotalCents + input.shippingCents;
  const estimatedCents = Math.round((base * entry.rate) / 10000);

  const noticeKey: IntlTaxEstimate['noticeKey'] =
    entry.kind === 'vat' ? 'vat_destination' :
    entry.kind === 'sales_tax' ? 'sales_tax_state' :
    'customs_destination';

  return {
    toCountry,
    taxKind: entry.kind,
    rateBps: entry.rate,
    estimatedCents,
    noticeKey,
    locale,
  };
}

export function intlTaxNoticeCopy(estimate: IntlTaxEstimate): { title: string; body: string } {
  const isPt = estimate.locale === 'pt-BR';
  if (estimate.noticeKey === 'none') return { title: '', body: '' };
  if (isPt) {
    if (estimate.noticeKey === 'vat_destination') {
      return {
        title: 'Imposto VAT no destino',
        body: 'Possíveis taxas alfandegárias e VAT incidem no país destino. Estimativa baseada na alíquota local.',
      };
    }
    if (estimate.noticeKey === 'sales_tax_state') {
      return {
        title: 'Sales tax estadual',
        body: 'Sales tax pode ser aplicado no destino conforme estado. Estimativa em base ao average estatutário.',
      };
    }
    return {
      title: 'Taxas alfandegárias',
      body: 'O envio internacional pode estar sujeito a IPI/ICMS/customs. O receptor é responsável por taxas no destino.',
    };
  }
  if (estimate.noticeKey === 'vat_destination') {
    return {
      title: 'Destination VAT',
      body: 'Possible customs/VAT charges apply at destination. Estimate based on local statutory rate.',
    };
  }
  if (estimate.noticeKey === 'sales_tax_state') {
    return {
      title: 'State sales tax',
      body: 'Sales tax may be applied based on destination state. Estimate uses statutory average.',
    };
  }
  return {
    title: 'Customs duties',
    body: 'International shipments may incur customs/import duties. The recipient is responsible for destination charges.',
  };
}
