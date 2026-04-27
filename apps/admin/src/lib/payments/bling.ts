// Bling NF-e — emissão automática ao faturar pedido (status paid → invoiced).
//
// Sem BLING_CLIENT_ID + BLING_CLIENT_SECRET: modo mock retorna invoiceKey fake
// (44 dígitos) — lojista emite manual via painel Bling depois.
// Com creds: OAuth2 client_credentials → POST /Api/v3/nfes.
//
// API ref: https://developer.bling.com.br/referencia#/NF-e

import { logger } from '@lojeo/logger';

const BLING_BASE = 'https://www.bling.com.br/Api/v3';

export interface NfeItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  ncm?: string; // código NCM fiscal (opcional)
  cfop?: string;
}

export interface NfeInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerCpfCnpj?: string;
  items: NfeItem[];
  totalCents: number;
  shippingCents: number;
  notes?: string;
}

export interface NfeResult {
  invoiceKey: string;       // chave de acesso 44 dígitos
  invoiceUrl: string | null; // URL DANFE PDF (null se não disponível ainda)
  blingId: string | null;    // ID interno Bling (null em mock)
  source: 'bling' | 'mock';
}

export function isBlingConfigured(): boolean {
  return Boolean(process.env.BLING_CLIENT_ID && process.env.BLING_CLIENT_SECRET);
}

/**
 * Gera chave fake 44 dígitos baseada em orderId + timestamp pra mock.
 * Formato real: UF(2) + AAMM(4) + CNPJ(14) + Modelo(2) + Serie(3) + NF(9) + cNF(8) + DV(1)
 */
function mockInvoiceKey(orderId: string): string {
  const ts = Date.now().toString();
  const seed = orderId.replace(/-/g, '') + ts;
  const digits = seed.replace(/[^0-9]/g, '').padEnd(44, '0').slice(0, 44);
  return digits;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

// Test helper — reset cache entre testes pra evitar carry-over de tokens.
export function __resetBlingTokenCache(): void {
  cachedToken = null;
}

async function getOAuthToken(): Promise<string | null> {
  const id = process.env.BLING_CLIENT_ID;
  const secret = process.env.BLING_CLIENT_SECRET;
  if (!id || !secret) return null;

  // Cache token até 1 minuto antes de expirar
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  try {
    const r = await fetch(`${BLING_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (!r.ok) {
      logger.warn({ status: r.status }, 'bling oauth failed');
      return null;
    }
    const data = (await r.json()) as { access_token: string; expires_in: number };
    cachedToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, 'bling oauth threw');
    return null;
  }
}

export async function createBlingNfe(input: NfeInput): Promise<NfeResult> {
  if (!isBlingConfigured()) {
    return {
      invoiceKey: mockInvoiceKey(input.orderId),
      invoiceUrl: null,
      blingId: null,
      source: 'mock',
    };
  }

  const token = await getOAuthToken();
  if (!token) {
    return {
      invoiceKey: mockInvoiceKey(input.orderId),
      invoiceUrl: null,
      blingId: null,
      source: 'mock',
    };
  }

  const payload = {
    tipo: 1, // 1=saída
    numeroLoja: input.orderNumber,
    dataOperacao: new Date().toISOString().slice(0, 10),
    contato: {
      nome: input.customerName,
      email: input.customerEmail ?? undefined,
      numeroDocumento: input.customerCpfCnpj ?? undefined,
    },
    itens: input.items.map((it) => ({
      descricao: it.description.slice(0, 120),
      quantidade: it.quantity,
      valor: it.unitPriceCents / 100,
      codigo: it.ncm,
    })),
    transporte: {
      frete: input.shippingCents / 100,
    },
    observacoes: input.notes,
  };

  try {
    const r = await fetch(`${BLING_BASE}/nfes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const text = await r.text();
      logger.warn({ status: r.status, body: text.slice(0, 500) }, 'bling nfe create failed');
      throw new Error(`bling_nfe_failed_${r.status}`);
    }
    const data = (await r.json()) as { data?: { id?: string; chaveAcesso?: string; xmlUrl?: string; pdfUrl?: string } };
    return {
      invoiceKey: data.data?.chaveAcesso ?? mockInvoiceKey(input.orderId),
      invoiceUrl: data.data?.pdfUrl ?? null,
      blingId: data.data?.id ?? null,
      source: 'bling',
    };
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err, orderId: input.orderId }, 'bling nfe threw');
    // Falha real: NÃO cair em mock — retornar throw para caller emit fiscal.failed
    throw err;
  }
}
