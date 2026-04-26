import { LocalDriver } from './local';
import { R2Driver } from './r2';
import type { StorageDriver } from './types';

export * from './types';
export { LocalDriver, R2Driver };

let cached: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (cached) return cached;
  const driver = process.env.STORAGE_DRIVER ?? 'local';
  if (driver === 'r2') {
    cached = new R2Driver({
      accountId: requireEnv('R2_ACCOUNT_ID'),
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
      bucket: requireEnv('R2_BUCKET'),
      publicUrl: process.env.R2_PUBLIC_URL,
    });
  } else {
    cached = new LocalDriver(process.env.STORAGE_LOCAL_DIR ?? './.local-storage');
  }
  return cached;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Env ${name} obrigatório quando STORAGE_DRIVER=r2`);
  return v;
}
