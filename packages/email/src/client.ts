import { Resend } from 'resend';
import { logger } from '@lojeo/logger';

export interface SendEmailInput {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Sobrescreve maxRetries default (3). Use 0 pra desabilitar retry. */
  maxRetries?: number;
}

export interface SendResult {
  id: string | null;
  delivered: boolean;
  /** Quantas tentativas reais foram feitas (0 quando mocked). */
  attempts?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Para uso em testes — permite injetar sleep mock pra evitar wait real.
 */
let sleepFn: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms));
export function __setSleepFn(fn: (ms: number) => Promise<void>): void {
  sleepFn = fn;
}
export function __resetSleepFn(): void {
  sleepFn = (ms) => new Promise((r) => setTimeout(r, ms));
}

/**
 * Backoff exponencial: tentativa N espera BASE_DELAY * (4^(N-1)) ms.
 *  attempt 1 → 0ms (imediato)
 *  attempt 2 → 2s
 *  attempt 3 → 8s
 *  attempt 4 → 32s
 */
export function backoffDelayMs(attemptZeroBased: number): number {
  if (attemptZeroBased <= 0) return 0;
  return BASE_DELAY_MS * Math.pow(4, attemptZeroBased - 1);
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ to: input.to, subject: input.subject }, 'RESEND_API_KEY ausente — email mockado');
    return { id: null, delivered: false, attempts: 0 };
  }
  const resend = new Resend(apiKey);
  const maxRetries = Math.max(0, input.maxRetries ?? DEFAULT_MAX_RETRIES);

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = backoffDelayMs(attempt);
      await sleepFn(delay);
    }
    try {
      const { data, error } = await resend.emails.send({
        from: input.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      });
      if (!error) {
        return { id: data?.id ?? null, delivered: true, attempts: attempt + 1 };
      }
      lastErr = error;
      logger.warn({ err: error, attempt: attempt + 1 }, 'Resend retornou erro — retry');
    } catch (err) {
      lastErr = err;
      logger.warn({ err: err instanceof Error ? err.message : err, attempt: attempt + 1 }, 'Resend throw — retry');
    }
  }
  logger.error({ err: lastErr, attempts: maxRetries + 1 }, 'falha Resend após todos retries');
  return { id: null, delivered: false, attempts: maxRetries + 1 };
}
