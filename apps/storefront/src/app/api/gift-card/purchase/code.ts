// Gerador de código de gift card. Alfabeto exclui chars visualmente ambíguos
// (0/O, 1/I/L) para evitar erros ao digitar do email/SMS na PDP.
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateGiftCode(rand: () => number = Math.random): string {
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHA[Math.floor(rand() * ALPHA.length)]).join('');
  return `GIFT-${block(4)}-${block(4)}`;
}
