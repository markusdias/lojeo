/**
 * File signature validation — verifica magic bytes vs MIME esperado.
 *
 * Bloqueia upload de scripts/HTML disfarçados de imagem (extensão renomeada).
 * Não substitui verificação adicional (ex: sharp() rejeita conteúdo malformado),
 * mas é primeira linha de defesa rápida.
 */

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'image/heic' | 'image/heif';

interface Signature {
  mime: ImageMime;
  matches(buf: Buffer | Uint8Array): boolean;
}

function startsWith(buf: Buffer | Uint8Array, hex: string, offset = 0): boolean {
  const bytes = hex.split(' ').map(h => parseInt(h, 16));
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

const SIGNATURES: Signature[] = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', matches: (b) => startsWith(b, 'FF D8 FF') },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: 'image/png', matches: (b) => startsWith(b, '89 50 4E 47 0D 0A 1A 0A') },
  // WebP: RIFF....WEBP — magic at offset 0 (RIFF) + offset 8 (WEBP)
  { mime: 'image/webp', matches: (b) => startsWith(b, '52 49 46 46') && startsWith(b, '57 45 42 50', 8) },
  // GIF: GIF87a or GIF89a
  { mime: 'image/gif', matches: (b) => startsWith(b, '47 49 46 38 37 61') || startsWith(b, '47 49 46 38 39 61') },
  // HEIC/HEIF: ftypheic/ftypmif1/ftypheix at offset 4
  { mime: 'image/heic', matches: (b) => startsWith(b, '66 74 79 70', 4) },
  { mime: 'image/heif', matches: (b) => startsWith(b, '66 74 79 70', 4) },
];

/**
 * Detecta MIME real pelo conteúdo. Retorna null se não bater com nenhum tipo de imagem suportado.
 */
export function detectImageMime(buf: Buffer | Uint8Array): ImageMime | null {
  if (!buf || buf.length < 12) return null;
  for (const sig of SIGNATURES) {
    if (sig.matches(buf)) return sig.mime;
  }
  return null;
}

/**
 * Valida que arquivo é imagem real (qualquer formato suportado).
 */
export function isValidImageUpload(buf: Buffer | Uint8Array): boolean {
  return detectImageMime(buf) !== null;
}
