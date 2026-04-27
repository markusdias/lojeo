// Validação CPF brasileiro — algoritmo dígitos verificadores módulo 11.
//
// Padrão: AAA.AAA.AAA-DV onde A=9 dígitos identificadores + DV=2 dígitos verificadores.
// CPFs all-same-digit são tecnicamente válidos pelo algoritmo mas reservados/inválidos
// por convenção da Receita Federal (usados em testes/mocks). Rejeitamos.

/** Remove tudo que não é dígito. */
export function stripCpf(input: string): string {
  return (input ?? '').replace(/\D/g, '');
}

/**
 * Valida CPF brasileiro pelo algoritmo módulo 11 dos dígitos verificadores.
 * Aceita formatado (000.000.000-00) ou só dígitos.
 */
export function isValidCpf(input: string): boolean {
  const digits = stripCpf(input);
  if (digits.length !== 11) return false;
  // Rejeita all-same-digit (000.000.000-00, 111.111.111-11, …)
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

/** Formata 11 dígitos crus em 000.000.000-00. Retorna entrada se inválido tamanho. */
export function formatCpf(input: string): string {
  const d = stripCpf(input);
  if (d.length !== 11) return input;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
