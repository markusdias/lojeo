import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, tenants } from '@lojeo/db';
import { TENANT_ID } from '../../../../lib/roles';
import { listProviders, isProviderConnected, maskCredentials, type StoredCredentials } from '../../../../lib/integrations-config';

export const dynamic = 'force-dynamic';

type Status = 'connected' | 'partial' | 'disconnected' | 'optional';

interface Integration {
  id: string;
  category: string;
  name: string;
  status: Status;
  message: string;
  envVarsRequired: string[];
  envVarsPresent: string[];
  storedCredentials: StoredCredentials;
  source: 'env' | 'config' | 'none';
  helper?: string;
  docsUrl?: string;
}

interface TenantConfigShape {
  integrations?: Record<string, StoredCredentials>;
  [k: string]: unknown;
}

export async function GET() {
  let stored: Record<string, StoredCredentials> = {};
  try {
    const tenant = await db.query.tenants?.findFirst({ where: eq(tenants.id, TENANT_ID) });
    const config = (tenant?.config ?? {}) as TenantConfigShape;
    stored = config.integrations ?? {};
  } catch {
    // DB indisponível — modo degradado: status só por env vars
    stored = {};
  }

  const integrations: Integration[] = listProviders().map((p) => {
    const envPresent = p.envVars.filter((e) => Boolean(process.env[e]));
    const fromEnv = envPresent.length === p.envVars.length && p.envVars.length > 0;
    const creds = stored[p.id];
    const connected = isProviderConnected(p, envPresent, creds);
    const source: Integration['source'] = fromEnv ? 'env' : connected ? 'config' : 'none';

    let status: Status = 'disconnected';
    let message = 'Não conectado';
    if (connected) {
      status = 'connected';
      message = source === 'env'
        ? 'Conectado via variáveis de ambiente'
        : 'Conectado via painel admin';
    } else if (envPresent.length > 0 || (creds && Object.keys(creds).length > 0)) {
      status = 'partial';
      const missing = p.envVars.filter((e) => !envPresent.includes(e));
      message = source === 'config'
        ? 'Credenciais incompletas — verifique campos obrigatórios'
        : `Parcial — falta(m): ${missing.join(', ')}`;
    }

    return {
      id: p.id,
      category: p.category,
      name: p.name,
      status,
      message,
      envVarsRequired: p.envVars,
      envVarsPresent: envPresent,
      storedCredentials: maskCredentials(creds),
      source,
      helper: p.helper,
      docsUrl: p.docsUrl,
    };
  });

  const summary = {
    connected: integrations.filter((i) => i.status === 'connected').length,
    partial: integrations.filter((i) => i.status === 'partial').length,
    disconnected: integrations.filter((i) => i.status === 'disconnected').length,
    optional: integrations.filter((i) => i.status === 'optional').length,
    total: integrations.length,
  };

  return NextResponse.json({ integrations, summary, checkedAt: new Date().toISOString() });
}
