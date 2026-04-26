import { Resend } from 'resend';
import { logger } from '@lojeo/logger';

export interface SendEmailInput {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendResult {
  id: string | null;
  delivered: boolean;
}

export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn({ to: input.to, subject: input.subject }, 'RESEND_API_KEY ausente — email mockado');
    return { id: null, delivered: false };
  }
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
  if (error) {
    logger.error({ err: error }, 'falha Resend');
    return { id: null, delivered: false };
  }
  return { id: data?.id ?? null, delivered: true };
}
