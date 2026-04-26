import type { NextRequest } from 'next/server';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

export function getTenantId(req: NextRequest): string {
  return req.headers.get('x-tenant-id') ?? process.env.TENANT_ID ?? DEFAULT_TENANT;
}
