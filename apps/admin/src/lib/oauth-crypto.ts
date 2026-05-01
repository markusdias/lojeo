import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

// AES-256-GCM. Key derivada de OAUTH_ENCRYPTION_KEY (>= 32 chars) via SHA-256.
// Fallback dev: chave determinística baseada em DATABASE_URL — NÃO usar em prod.
function getKey(): Buffer {
  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('OAUTH_ENCRYPTION_KEY missing or too short in production');
    }
    const fallback = process.env.DATABASE_URL ?? 'dev-fallback-key';
    return createHash('sha256').update(`lojeo-oauth-dev:${fallback}`).digest();
  }
  return createHash('sha256').update(raw).digest();
}

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  if (!payload) return '';
  const [ivB64, tagB64, encB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !encB64) throw new Error('invalid_encrypted_payload');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

// State assinado HMAC pra OAuth — previne CSRF e vincula callback ao tenant.
export function signState(payload: Record<string, string | number>): string {
  const json = JSON.stringify(payload);
  const sig = createHash('sha256').update(`${json}::${getKey().toString('base64')}`).digest('base64url');
  return `${Buffer.from(json).toString('base64url')}.${sig}`;
}

export function verifyState(state: string): Record<string, string | number> | null {
  const [body, sig] = state.split('.');
  if (!body || !sig) return null;
  const json = Buffer.from(body, 'base64url').toString('utf8');
  const expected = createHash('sha256').update(`${json}::${getKey().toString('base64')}`).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(json) as Record<string, string | number>;
  } catch {
    return null;
  }
}
