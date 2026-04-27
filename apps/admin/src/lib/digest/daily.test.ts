import { describe, it, expect } from 'vitest';
import { formatDailyDigestDateLabel } from './daily';

describe('formatDailyDigestDateLabel', () => {
  it('pt-BR formata "27 de abr · seg" abreviado', () => {
    const d = new Date('2026-04-27T12:00:00Z');
    const label = formatDailyDigestDateLabel(d, 'pt-BR');
    // pt-BR locale gera "seg., 27 de abr." ou "27 de abr." dependendo do node version
    expect(label.toLowerCase()).toMatch(/abr/);
    expect(label).toContain('27');
  });

  it('en-US formata "Mon, Apr 27"', () => {
    const d = new Date('2026-04-27T12:00:00Z');
    const label = formatDailyDigestDateLabel(d, 'en-US');
    expect(label).toContain('Apr');
    expect(label).toContain('27');
  });

  it('default pt-BR quando locale omitido', () => {
    const d = new Date('2026-04-27T12:00:00Z');
    const label = formatDailyDigestDateLabel(d);
    expect(label.toLowerCase()).toMatch(/abr/);
  });
});
