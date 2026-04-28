import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, tenants } from '@lojeo/db';
import { TENANT_ID } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

type Creds = Record<string, string>;
export type TestResult = { ok: boolean; message: string; reason?: string };

async function ftch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 9000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

async function testMercadoPago(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.mercadopago.com/users/me', {
    headers: { Authorization: `Bearer ${c.accessToken}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: 'Token inválido ou sem permissão', reason: e.message ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { email?: string; nickname?: string };
  return { ok: true, message: `Conta: ${d.email ?? d.nickname ?? 'OK'}` };
}

async function testStripe(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.stripe.com/v1/account', {
    headers: { Authorization: `Basic ${Buffer.from(c.secretKey + ':').toString('base64')}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: false, message: 'Secret Key inválida', reason: e.error?.message ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { email?: string; id?: string };
  return { ok: true, message: `Conta: ${d.email ?? d.id}` };
}

async function testPayPal(c: Creds): Promise<TestResult> {
  const auth = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString('base64');
  const r = await ftch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error_description?: string };
    return { ok: false, message: 'Client ID ou Client Secret inválidos', reason: e.error_description ?? `HTTP ${r.status}` };
  }
  return { ok: true, message: 'OAuth OK — credenciais aceitas pelo PayPal' };
}

async function testPagarme(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.pagar.me/core/v5/companies/me', {
    headers: { Authorization: `Basic ${Buffer.from(c.apiKey + ':').toString('base64')}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: 'API Key inválida', reason: e.message ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { name?: string; email?: string };
  return { ok: true, message: `Conta: ${d.name ?? d.email ?? 'OK'}` };
}

async function testMelhorEnvio(c: Creds): Promise<TestResult> {
  const r = await ftch('https://melhorenvio.com.br/api/v2/me', {
    headers: {
      Authorization: `Bearer ${c.apiToken}`,
      Accept: 'application/json',
      'User-Agent': 'Lojeo/1.0 (contato@lojeo.com.br)',
    },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: 'Token inválido ou expirado', reason: e.message ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { email?: string; firstname?: string };
  return { ok: true, message: `Conta: ${d.email ?? d.firstname ?? 'OK'}` };
}

async function testAnthropic(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': c.apiKey ?? '',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
    return { ok: false, message: 'API Key inválida ou sem créditos', reason: e.error?.message ?? `HTTP ${r.status}` };
  }
  return { ok: true, message: 'API Key válida — Claude respondendo' };
}

async function testMiniMax(c: Creds): Promise<TestResult> {
  const r = await ftch(`https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${c.groupId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'abab6.5s-chat',
      messages: [{ role: 'user', name: 'user', content: 'hi' }],
      max_tokens: 1,
    }),
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { base_resp?: { status_msg?: string }; message?: string };
    return { ok: false, message: 'API Key ou Group ID inválidos', reason: e.base_resp?.status_msg ?? e.message ?? `HTTP ${r.status}` };
  }
  return { ok: true, message: 'API Key + Group ID válidos — MiniMax respondendo' };
}

async function testRemoveBg(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.remove.bg/v1.0/account', {
    headers: { 'X-Api-Key': c.apiKey ?? '' },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { errors?: Array<{ title?: string }> };
    return { ok: false, message: 'API Key inválida', reason: e.errors?.[0]?.title ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { data?: { attributes?: { credits?: { total?: number } } } };
  const credits = d.data?.attributes?.credits?.total ?? '?';
  return { ok: true, message: `Créditos disponíveis: ${credits}` };
}

async function testResend(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${c.apiKey}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { message?: string };
    return { ok: false, message: 'API Key inválida', reason: e.message ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { data?: Array<{ name: string }> };
  const domains = d.data?.map((x) => x.name).join(', ') || 'nenhum verificado';
  return { ok: true, message: `Domínios: ${domains}` };
}

async function testSendGrid(c: Creds): Promise<TestResult> {
  const r = await ftch('https://api.sendgrid.com/v3/scopes', {
    headers: { Authorization: `Bearer ${c.apiKey}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { errors?: Array<{ message?: string }> };
    return { ok: false, message: 'API Key inválida', reason: e.errors?.[0]?.message ?? `HTTP ${r.status}` };
  }
  return { ok: true, message: 'API Key válida — SendGrid respondendo' };
}

async function testBling(c: Creds): Promise<TestResult> {
  // Bling é authorization_code OAuth — sem access token armazenado, só valida presença
  if (!c.clientId || !c.clientSecret) {
    return { ok: false, message: 'Credenciais incompletas', reason: 'Client ID ou Client Secret ausente' };
  }
  return { ok: true, message: 'Credenciais salvas — conexão OAuth completa disponível em breve (1-clique)' };
}

async function testOlist(c: Creds): Promise<TestResult> {
  const r = await ftch(
    `https://api.tiny.com.br/api2/info.php?token=${encodeURIComponent(c.apiToken ?? '')}&formato=json`,
    {},
  );
  if (!r.ok) return { ok: false, message: 'Token inválido', reason: `HTTP ${r.status}` };
  const d = (await r.json()) as { retorno?: { status?: string; registros?: { registro?: { erros?: { erro?: string } } } } };
  if (d.retorno?.status === 'Erro') {
    return { ok: false, message: 'Token rejeitado pela API Tiny/Olist', reason: d.retorno?.registros?.registro?.erros?.erro ?? 'Token inválido' };
  }
  return { ok: true, message: 'Token válido — Olist Tiny respondendo' };
}

async function testFaqZap(c: Creds): Promise<TestResult> {
  if (!c.apiToken) return { ok: false, message: 'Token ausente', reason: 'Preencha o campo API Token' };
  return { ok: true, message: 'Token salvo — verificação automática indisponível (FaqZap não expõe endpoint de healthcheck)' };
}

async function testTriggerDev(c: Creds): Promise<TestResult> {
  const baseUrl = (c.apiUrl ?? 'https://api.trigger.dev').replace(/\/$/, '');
  const r = await ftch(`${baseUrl}/api/v1/whoami`, {
    headers: { Authorization: `Bearer ${c.apiKey}` },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    return { ok: false, message: 'Credenciais inválidas ou servidor inacessível', reason: e.error ?? `HTTP ${r.status}` };
  }
  const d = (await r.json()) as { userId?: string; email?: string };
  return { ok: true, message: `Usuário: ${d.userId ?? d.email ?? 'OK'}` };
}

const TESTERS: Record<string, (c: Creds) => Promise<TestResult>> = {
  mercadopago: testMercadoPago,
  stripe: testStripe,
  paypal: testPayPal,
  pagarme: testPagarme,
  melhorenvio: testMelhorEnvio,
  anthropic: testAnthropic,
  minimax: testMiniMax,
  removebg: testRemoveBg,
  resend: testResend,
  sendgrid: testSendGrid,
  bling: testBling,
  olist: testOlist,
  faqzap: testFaqZap,
  triggerdev: testTriggerDev,
};

export async function POST(req: NextRequest) {
  try {
    const { provider } = (await req.json()) as { provider: string };
    const tester = TESTERS[provider];
    if (!tester) {
      return NextResponse.json(
        { ok: false, message: 'Provider sem teste implementado', reason: `Desconhecido: ${provider}` },
        { status: 400 },
      );
    }

    const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, TENANT_ID) });
    if (!tenant) {
      return NextResponse.json({ ok: false, message: 'Tenant não encontrado' }, { status: 404 });
    }

    const config = (tenant.config ?? {}) as { integrations?: Record<string, Creds> };
    const creds: Creds = config.integrations?.[provider] ?? {};

    if (Object.keys(creds).length === 0) {
      return NextResponse.json({ ok: false, message: 'Sem credenciais salvas', reason: 'Configure e salve as credenciais antes de testar' });
    }

    const result = await tester(creds);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.toLowerCase().includes('timeout')) {
      return NextResponse.json({ ok: false, message: 'Timeout — serviço não respondeu em 9s', reason: 'Verifique se o serviço está acessível' });
    }
    return NextResponse.json({ ok: false, message: 'Erro interno', reason: msg }, { status: 500 });
  }
}
