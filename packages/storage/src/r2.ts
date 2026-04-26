import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PutOptions, PutResult, SignedUrlOptions, StorageDriver } from './types';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl?: string;
}

export class R2Driver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly cfg: R2Config) {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer | Uint8Array, opts?: PutOptions): Promise<PutResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.cfg.bucket,
        Key: key,
        Body: body,
        ContentType: opts?.contentType,
        CacheControl: opts?.cacheControl,
        Metadata: opts?.metadata,
      }),
    );
    return { key, url: this.publicUrl(key), size: body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const out = await this.client.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    const stream = out.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
  }

  async signedUrl(key: string, opts?: SignedUrlOptions): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }),
      { expiresIn: opts?.expiresInSec ?? 3600 },
    );
  }

  publicUrl(key: string): string {
    if (this.cfg.publicUrl) return `${this.cfg.publicUrl.replace(/\/$/, '')}/${key}`;
    return `https://${this.cfg.bucket}.${this.cfg.accountId}.r2.cloudflarestorage.com/${key}`;
  }
}
