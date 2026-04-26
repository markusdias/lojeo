import { describe, expect, it } from 'vitest';
import { sendEmail } from './client';

describe('sendEmail', () => {
  it('retorna mock sem RESEND_API_KEY', async () => {
    delete process.env.RESEND_API_KEY;
    const r = await sendEmail({
      from: 'no-reply@lojeo.dev',
      to: 'cliente@example.com',
      subject: 'Teste',
      html: '<p>oi</p>',
    });
    expect(r.delivered).toBe(false);
    expect(r.id).toBeNull();
  });
});
