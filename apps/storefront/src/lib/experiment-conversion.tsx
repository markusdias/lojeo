'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useCart } from '../components/cart/cart-provider';

/**
 * Hook + componentes para registrar conversões de experimento.
 *
 * Conversion event: `cart_add` (escolha entre cart_add | checkout_start
 * conforme spec Sprint 12). Disparamos no PRIMEIRO add ao carrinho dentro
 * da sessão para uma combinação experimentKey+variantKey+anonymousId.
 *
 * Idempotência: sessionStorage flag por (experimentKey:variantKey:anonId).
 * Em recargas da aba a flag persiste ⇒ não duplica. Em nova aba dispara
 * de novo (aceitável: contagem por sessão é o que importa para CRO).
 */

const SESSION_FLAG_PREFIX = 'lojeo_exp_conv_';

function flagKey(experimentKey: string, variantKey: string, anonymousId: string): string {
  return `${SESSION_FLAG_PREFIX}${experimentKey}:${variantKey}:${anonymousId}`;
}

function alreadyFired(experimentKey: string, variantKey: string, anonymousId: string): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(flagKey(experimentKey, variantKey, anonymousId)) === '1';
  } catch {
    return false;
  }
}

function markFired(experimentKey: string, variantKey: string, anonymousId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(flagKey(experimentKey, variantKey, anonymousId), '1');
  } catch {
    // sessionStorage indisponível (Safari privado) — falha silenciosa
  }
}

async function postConversion(
  experimentKey: string,
  variantKey: string,
  anonymousId: string,
  value: number,
): Promise<void> {
  try {
    await fetch('/api/experiments/conversion', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ experimentKey, variantKey, anonymousId, value }),
      keepalive: true,
    });
  } catch {
    // Modo degradado: tracking não bloqueia UX
  }
}

/**
 * Hook genérico — retorna `fire(value?)` que dispara conversion uma única
 * vez por sessão para o trio (experimentKey, variantKey, anonymousId).
 *
 * Use em qualquer ponto onde a conversão acontece (cart_add, checkout_start,
 * compra confirmada, etc.).
 */
export function useExperimentConversion(
  experimentKey: string,
  variantKey: string | null,
  anonymousId: string | null,
): (value?: number) => void {
  return useCallback(
    (value?: number) => {
      if (!experimentKey || !variantKey || !anonymousId) return;
      if (alreadyFired(experimentKey, variantKey, anonymousId)) return;
      markFired(experimentKey, variantKey, anonymousId);
      void postConversion(experimentKey, variantKey, anonymousId, value ?? 1);
    },
    [experimentKey, variantKey, anonymousId],
  );
}

interface CartAddConversionTrackerProps {
  experimentKey: string;
  variantKey: string | null;
  anonymousId: string | null;
}

/**
 * Componente passivo que observa `useCart().count` e dispara conversion
 * quando count cresce (cart_add). Use montado em uma página/section onde
 * a sessão deva ser computada (homepage no caso do experimento de
 * personalização).
 *
 * Não renderiza nada visualmente.
 */
export function CartAddConversionTracker({
  experimentKey,
  variantKey,
  anonymousId,
}: CartAddConversionTrackerProps) {
  const { count } = useCart();
  const prevCount = useRef<number | null>(null);
  const fire = useExperimentConversion(experimentKey, variantKey, anonymousId);

  useEffect(() => {
    // Primeira leitura: armazena baseline (não considera carrinho persistido
    // de visitas anteriores como conversão).
    if (prevCount.current === null) {
      prevCount.current = count;
      return;
    }
    if (count > prevCount.current) {
      fire(1);
    }
    prevCount.current = count;
  }, [count, fire]);

  return null;
}
