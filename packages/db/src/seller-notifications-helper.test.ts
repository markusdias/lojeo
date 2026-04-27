import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock client antes do import: db.select/from/where retorna config controlado.
type MockTenantConfig = { notifications?: { disabledTypes?: string[] } };
let mockTenantConfig: MockTenantConfig = {};
let insertCalled = 0;

vi.mock('./client', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ config: mockTenantConfig }])),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => {
          insertCalled++;
          return Promise.resolve([{ id: `notif-${insertCalled}` }]);
        }),
      })),
    })),
  },
}));

// Importa depois do mock pra capturar refs corretas.
import {
  emitSellerNotification,
  __resetNotificationPrefsCache,
} from './seller-notifications-helper';

describe('emitSellerNotification — preferences gate', () => {
  beforeEach(() => {
    mockTenantConfig = {};
    insertCalled = 0;
    __resetNotificationPrefsCache();
  });

  it('insere notification quando type não está em disabledTypes', async () => {
    mockTenantConfig = { notifications: { disabledTypes: ['order.paid'] } };
    const result = await emitSellerNotification({
      tenantId: 'tenant-1',
      type: 'order.created',
      title: 'Test',
    });
    expect(result).toEqual({ id: 'notif-1' });
    expect(insertCalled).toBe(1);
  });

  it('skip silencioso quando type está em disabledTypes', async () => {
    mockTenantConfig = { notifications: { disabledTypes: ['order.paid', 'churn.alert'] } };
    const result = await emitSellerNotification({
      tenantId: 'tenant-1',
      type: 'churn.alert',
      title: 'Test',
    });
    expect(result).toBeNull();
    expect(insertCalled).toBe(0);
  });

  it('default sem prefs habilita todos tipos', async () => {
    mockTenantConfig = {};
    const result = await emitSellerNotification({
      tenantId: 'tenant-1',
      type: 'fiscal.failed',
      title: 'Test',
    });
    expect(result).toEqual({ id: 'notif-1' });
  });

  it('cache reset permite update sem TTL wait', async () => {
    mockTenantConfig = { notifications: { disabledTypes: ['order.created'] } };
    const r1 = await emitSellerNotification({
      tenantId: 'tenant-cache',
      type: 'order.created',
      title: 'Test',
    });
    expect(r1).toBeNull();

    // Simula update prefs + cache invalidation
    mockTenantConfig = { notifications: { disabledTypes: [] } };
    __resetNotificationPrefsCache();

    const r2 = await emitSellerNotification({
      tenantId: 'tenant-cache',
      type: 'order.created',
      title: 'Test',
    });
    expect(r2).not.toBeNull();
  });

  it('disabledTypes vazio aceita todos', async () => {
    mockTenantConfig = { notifications: { disabledTypes: [] } };
    const result = await emitSellerNotification({
      tenantId: 'tenant-1',
      type: 'review.pending',
      title: 'Test',
    });
    expect(result).toEqual({ id: 'notif-1' });
  });

  it('title cap 200 chars', async () => {
    mockTenantConfig = {};
    const longTitle = 'x'.repeat(300);
    const result = await emitSellerNotification({
      tenantId: 'tenant-1',
      type: 'review.pending',
      title: longTitle,
    });
    // Apenas valida que não lança — slice acontece no helper
    expect(result).not.toBeNull();
  });
});
