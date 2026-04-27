/**
 * Wrapper de integração com Remove.bg API.
 *
 * Sprint 7 (assets) — geração de versão sem fundo das imagens de produto.
 *
 * Modo degradado: se `apiKey` for vazio retorna `{ ok: false, error: 'no_api_key' }`
 * SEM efetuar chamada de rede. O caller deve interpretar isso como "feature
 * indisponível" e seguir o fluxo normal preservando a imagem original.
 *
 * Falhas de rede / 4xx / 5xx também retornam `{ ok: false }` — Remove.bg é
 * enrichment opcional e nunca deve quebrar o upload de imagem.
 */

const REMOVE_BG_ENDPOINT = 'https://api.remove.bg/v1.0/removebg';

export interface RemoveBgOptions {
  /** API key Remove.bg. Se vazio/undefined → modo degradado (no_api_key). */
  apiKey: string;
  /** Buffer da imagem original. */
  image: Buffer;
  /** Mime type da imagem (default image/png). */
  mime?: string;
  /** Override do endpoint (útil para testes). */
  endpoint?: string;
}

export interface RemoveBgResult {
  ok: boolean;
  /** Imagem PNG sem fundo, se ok=true. */
  image?: Buffer;
  /** Código de erro: 'no_api_key' | 'http_<status>' | 'network_error' | 'empty_response'. */
  error?: string;
  /** Mensagem detalhada do provedor (se disponível). */
  detail?: string;
}

export async function removeBg(opts: RemoveBgOptions): Promise<RemoveBgResult> {
  const apiKey = (opts.apiKey ?? '').trim();
  if (!apiKey) {
    return { ok: false, error: 'no_api_key' };
  }

  const mime = opts.mime ?? 'image/png';
  const endpoint = opts.endpoint ?? REMOVE_BG_ENDPOINT;

  const form = new FormData();
  // Blob é suportado em runtime Node 20+ (e Next.js 15 polyfill).
  form.append('image_file', new Blob([new Uint8Array(opts.image)], { type: mime }), 'image');
  form.append('size', 'auto');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    });
  } catch (err) {
    return {
      ok: false,
      error: 'network_error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = await res.text();
    } catch {
      // ignore
    }
    return { ok: false, error: `http_${res.status}`, detail };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength === 0) {
    return { ok: false, error: 'empty_response' };
  }

  return { ok: true, image: buf };
}
