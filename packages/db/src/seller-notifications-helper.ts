import { db } from './client';
import { sellerNotifications, type NewSellerNotification } from './schema/notifications';

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

export async function emitSellerNotification(
  input: EmitSellerNotificationInput,
): Promise<{ id: string } | null> {
  try {
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
    // Notification emit é best-effort — nunca quebra fluxo principal
    console.error('[emitSellerNotification]', err);
    return null;
  }
}
