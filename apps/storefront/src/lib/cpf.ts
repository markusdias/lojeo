// CPF validator módulo 11 — duplicado de @lojeo/engine/cpf.ts pra evitar
// pull do barrel `engine/index.ts` (que tem deps Node-only postgres-js via
// `tenant.ts`) em client components / Edge Runtime.
//
// Manter sincronizado com packages/engine/src/cpf.ts.

export function stripCpf(input: string): string {
  return (input ?? '').replace(/\D/g, '');
}

export function isValidCpf(input: string): boolean {
  const digits = stripCpf(input);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  function checksum(slice: string, weightStart: number): number {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += Number(slice[i]) * (weightStart - i);
    }
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  }

  const dv1 = checksum(digits.slice(0, 9), 10);
  if (dv1 !== Number(digits[9])) return false;
  const dv2 = checksum(digits.slice(0, 10), 11);
  if (dv2 !== Number(digits[10])) return false;
  return true;
}
