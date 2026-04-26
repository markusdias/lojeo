import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDriver } from './local';

let dir: string;
let driver: LocalDriver;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'lojeo-storage-'));
  driver = new LocalDriver(dir);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('LocalDriver', () => {
  it('grava e recupera bytes', async () => {
    const body = Buffer.from('teste-joia-2026');
    const r = await driver.put('produtos/anel.txt', body);
    expect(r.key).toBe('produtos/anel.txt');
    expect(r.size).toBe(body.byteLength);

    const recovered = await driver.get('produtos/anel.txt');
    expect(recovered.toString()).toBe('teste-joia-2026');
  });

  it('apaga arquivo', async () => {
    await driver.put('tmp/x.bin', Buffer.from([1, 2, 3]));
    await driver.delete('tmp/x.bin');
    await expect(driver.get('tmp/x.bin')).rejects.toThrow();
  });

  it('apaga inexistente sem erro', async () => {
    await expect(driver.delete('nao-existe.txt')).resolves.toBeUndefined();
  });

  it('gera publicUrl previsível', () => {
    expect(driver.publicUrl('a/b.png')).toBe('/_storage/a/b.png');
  });
});
