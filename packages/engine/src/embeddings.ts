// Mock embeddings determinístico — Sprint 12.
//
// V1: gera vetores estáveis a partir do texto via hashing de palavras,
// permitindo exercitar pipeline de busca semântica sem custo de provider
// externo. Comparação via cosineSimilarity em memória.
//
// V2: trocar `mockEmbedding` por `embed()` que delega para OpenAI
// `text-embedding-3-small` (1536d) ou Cohere embed-multilingual-v3 (1024d).
// A função stable hash continua útil como fallback offline determinístico
// para testes e modo degradado.

const DEFAULT_DIMENSIONS = 256;

/** Hash simples FNV-1a 32-bit — determinístico e cross-platform. */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // Multiplica por FNV prime via shifts (mantém em 32 bits unsigned)
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash >>> 0;
}

/** Tokeniza texto em palavras lowercase, removendo diacríticos básicos. */
function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');
  return normalized.split(/\s+/).filter((w) => w.length > 1);
}

/**
 * Gera embedding determinístico de `text` com `dimensions` componentes,
 * normalizado L2 (norma ≈ 1). Mesmo input sempre produz mesmo vetor.
 *
 * Algoritmo:
 *   1. Tokeniza em palavras
 *   2. Para cada palavra: projeta em 3 dimensões via FNV hash + variantes
 *      (hash da palavra, hash de "1:" + palavra, hash de "2:" + palavra)
 *   3. Pondera pela frequência (tf) — palavras repetidas reforçam dimensões
 *   4. Normaliza L2
 *
 * Para texto vazio retorna vetor zero (norma = 0).
 */
export function mockEmbedding(text: string, dimensions: number = DEFAULT_DIMENSIONS): number[] {
  if (dimensions <= 0) {
    throw new Error('dimensions must be > 0');
  }
  const vec = new Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return vec;
  }

  // Frequência por palavra (term frequency)
  const tf = new Map<string, number>();
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) ?? 0) + 1);
  }

  for (const [word, freq] of tf) {
    // Cada palavra projeta em 3 dimensões para densificar o vetor
    const h1 = fnv1a(word);
    const h2 = fnv1a('s1:' + word);
    const h3 = fnv1a('s2:' + word);

    const d1 = h1 % dimensions;
    const d2 = h2 % dimensions;
    const d3 = h3 % dimensions;

    // Sinal pseudo-aleatório porém determinístico (bit alto do hash)
    const sign1 = (h1 & 0x80000000) ? -1 : 1;
    const sign2 = (h2 & 0x80000000) ? -1 : 1;
    const sign3 = (h3 & 0x80000000) ? -1 : 1;

    const weight = Math.log(1 + freq);
    const v1 = vec[d1] ?? 0;
    const v2 = vec[d2] ?? 0;
    const v3 = vec[d3] ?? 0;
    vec[d1] = v1 + sign1 * weight;
    vec[d2] = v2 + sign2 * weight * 0.7;
    vec[d3] = v3 + sign3 * weight * 0.5;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    const v = vec[i] ?? 0;
    norm += v * v;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < dimensions; i++) {
    vec[i] = (vec[i] ?? 0) / norm;
  }
  return vec;
}

/**
 * Cosine similarity clássico. Retorna em [-1, 1]; 1 = idêntico, 0 = ortogonal.
 * Para vetores L2-normalizados equivale a dot product.
 * Retorna 0 se algum vetor for zero (sem palavras) ou tiverem dimensões diferentes.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Serializa vetor para armazenar como JSON em coluna text. */
export function encodeEmbedding(vec: number[]): string {
  return JSON.stringify(vec);
}

/** Desserializa vetor armazenado. Retorna null se inválido. */
export function decodeEmbedding(serialized: string | null | undefined): number[] | null {
  if (!serialized) return null;
  try {
    const parsed = JSON.parse(serialized);
    if (!Array.isArray(parsed)) return null;
    if (parsed.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return null;
    return parsed as number[];
  } catch {
    return null;
  }
}
