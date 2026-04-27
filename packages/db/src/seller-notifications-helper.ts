import { eq } from 'drizzle-orm';
import { db } from './client';
import { sellerNotifications, type NewSellerNotification } from './schema/notifications';
import { tenants } from './schema/tenants';

export type EmitSellerNotificationInput = {
  tenantId: string;
  userId?: string | null;
  type: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  body?: string | null;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

interface NotificationPrefs {
  disabledTypes?: string[];
}

interface TenantConfigShape {
  notifications?: NotificationPrefs;
  [k: string]: unknown;
}

/**
 * Cache em memória de preferences por tenant (TTL 60s).
 * Reduz query repetida em emit hooks sem complicar invalidação.
 */
const prefsCache = new Map<string, { prefs: NotificationPrefs; expiresAt: number }>();
const PREFS_TTL_MS = 60_000;

async function getNotificationPrefs(tenantId: string): Promise<NotificationPrefs> {
  const cached = prefsCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now()) return cached.prefs;
  try {
    const [tenant] = await db
      .select({ config: tenants.config })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    const config = (tenant?.config ?? {}) as TenantConfigShape;
    const prefs = config.notifications ?? {};
    prefsCache.set(tenantId, { prefs, expiresAt: Date.now() + PREFS_TTL_MS });
    return prefs;
  } catch {
    // Sem DB acessível: assume default (tudo habilitado)
    return {};
  }
}

export function __resetNotificationPrefsCache(): void {
  prefsCache.clear();
}

export async function emitSellerNotification(
  input: EmitSellerNotificationInput,
): Promise<{ id: string } | null> {
  try {
    const prefs = await getNotificationPrefs(input.tenantId);
    if (prefs.disabledTypes?.includes(input.type)) {
      return null;
    }
    const row: NewSellerNotification = {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      type: input.type,
      severity: input.severity ?? 'info',
      title: input.title.slice(0, 200),
      body: input.body ?? null,
      link: input.link ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
    };
    const inserted = await db
      .insert(sellerNotifications)
      .values(row)
      .returning({ id: sellerNotifications.id });
    return inserted[0] ?? null;
  } catch (err) {
    console.error('[emitSellerNotification]', err);
    return null;
  }
}
