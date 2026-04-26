export type ModelTier = 'haiku' | 'sonnet';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiCallParams {
  feature: string;
  tenantId?: string;
  tier?: ModelTier;
  system?: string;
  messages: AiMessage[];
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  cacheTtlSec?: number;
}

export interface AiCallResult {
  text: string;
  cached: boolean;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicro: number;
  durationMs: number;
}

export interface Provider {
  name: string;
  call(p: AiCallParams): Promise<AiCallResult>;
}
