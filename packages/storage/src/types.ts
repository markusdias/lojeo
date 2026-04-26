export interface PutOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface PutResult {
  key: string;
  url: string;
  size: number;
}

export interface SignedUrlOptions {
  expiresInSec?: number;
}

export interface StorageDriver {
  put(key: string, body: Buffer | Uint8Array, opts?: PutOptions): Promise<PutResult>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  signedUrl(key: string, opts?: SignedUrlOptions): Promise<string>;
  publicUrl(key: string): string;
}
