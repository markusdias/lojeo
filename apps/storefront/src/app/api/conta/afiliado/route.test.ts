import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Helper: replicate signup schema for unit-level validation
const signupSchema = z.object({
  affiliateName: z.string().min(2).max(200),
  code: z.string().min(2).max(32).regex(/^[A-Z0-9-]+$/, 'code must be A-Z 0-9 -'),
});

describe('signupSchema', () => {
  it('accepts valid name + code', () => {
    const r = signupSchema.safeParse({ affiliateName: 'Maria Silva', code: 'MARIA10' });
    expect(r.success).toBe(true);
  });

  it('rejects short name', () => {
    const r = signupSchema.safeParse({ affiliateName: 'M', code: 'MARIA10' });
    expect(r.success).toBe(false);
  });

  it('rejects code with lowercase', () => {
    const r = signupSchema.safeParse({ affiliateName: 'Maria', code: 'maria10' });
    expect(r.success).toBe(false);
  });

  it('rejects code with special chars', () => {
    const r = signupSchema.safeParse({ affiliateName: 'Maria', code: 'MARIA@10' });
    expect(r.success).toBe(false);
  });

  it('accepts hyphenated code', () => {
    const r = signupSchema.safeParse({ affiliateName: 'Maria', code: 'MARIA-10' });
    expect(r.success).toBe(true);
  });

  it('rejects code too long', () => {
    const r = signupSchema.safeParse({ affiliateName: 'Maria', code: 'A'.repeat(33) });
    expect(r.success).toBe(false);
  });
});
