import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import crypto from 'node:crypto';

authenticator.options = {
  step: 30,
  window: 1, // tolerar 1 passo (30s) atrás/à frente para clock skew
};

export const TOTP_ISSUER = 'Lojeo Admin';

export function generateSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return authenticator.keyuri(email, TOTP_ISSUER, secret);
}

export async function buildQrPng(otpauthUrl: string): Promise<string> {
  return qrcode.toDataURL(otpauthUrl, { width: 240, margin: 1 });
}

export function verifyTotp(token: string, secret: string): boolean {
  const trimmed = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(trimmed)) return false;
  try {
    return authenticator.verify({ token: trimmed, secret });
  } catch {
    return false;
  }
}

// Recovery codes: gerar 10 códigos legíveis e armazenar SHA-256
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex'); // 10 chars
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toLowerCase()).digest('hex');
}

export function verifyRecoveryCode(code: string, hashes: string[]): { valid: boolean; remainingHashes: string[] } {
  const target = hashRecoveryCode(code);
  const idx = hashes.indexOf(target);
  if (idx === -1) return { valid: false, remainingHashes: hashes };
  const remaining = [...hashes.slice(0, idx), ...hashes.slice(idx + 1)];
  return { valid: true, remainingHashes: remaining };
}
