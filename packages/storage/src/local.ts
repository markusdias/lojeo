import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { PutOptions, PutResult, SignedUrlOptions, StorageDriver } from './types';

export class LocalDriver implements StorageDriver {
  constructor(
    private readonly baseDir: string,
    private readonly publicBase = '/_storage',
  ) {}

  private path(key: string): string {
    return resolve(join(this.baseDir, key));
  }

  async put(key: string, body: Buffer | Uint8Array, _opts?: PutOptions): Promise<PutResult> {
    const filepath = this.path(key);
    await mkdir(dirname(filepath), { recursive: true });
    await writeFile(filepath, body);
    return { key, url: this.publicUrl(key), size: body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.path(key));
  }

  async delete(key: string): Promise<void> {
    await unlink(this.path(key)).catch((e: Error & { code?: string }) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }

  async signedUrl(key: string, _opts?: SignedUrlOptions): Promise<string> {
    return this.publicUrl(key);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}
