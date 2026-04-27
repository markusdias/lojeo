'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getAnonId } from '@lojeo/tracking/client';
import { CartAddConversionTracker } from '../../lib/experiment-conversion';

/**
 * HomePersonalizationGate — controla a A/B test `homepage_personalization`
 * no client (anonymousId vive em localStorage, então a decisão de variante
 * precisa acontecer client-side).
 *
 * Estratégia: renderiza ambas variantes server-side (control e personalized)
 * dentro de wrappers que iniciam com `display:none` e ativam a correta após
 * a chamada GET /api/experiments. Default antes do fetch: control (mostra
 * versão estática como fallback seguro — evita flash de personalização).
 *
 * Em caso de falha no fetch: permanece em `control` (modo degradado).
 *
 * O componente também monta um tracker de conversão (cart_add) com a variante
 * efetivamente atribuída ao usuário.
 */

export const EXPERIMENT_KEY = 'homepage_personalization';
export type Variant = 'control' | 'personalized';

interface VariantContextValue {
  variant: Variant;
  resolved: boolean;
  anonymousId: string | null;
}

const VariantContext = createContext<VariantContextValue>({
  variant: 'control',
  resolved: false,
  anonymousId: null,
});

interface AssignmentResponse {
  assignments?: Record<string, { variantKey?: string }>;
}

export function HomePersonalizationProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<Variant>('control');
  const [resolved, setResolved] = useState(false);
  const [anonymousId, setAnonymousId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let anon: string;
    try {
      anon = getAnonId();
    } catch {
      // sem localStorage: mantém control e não tracka
      setResolved(true);
      return () => {
        cancelled = true;
      };
    }
    setAnonymousId(anon);

    const url = `/api/experiments?keys=${encodeURIComponent(EXPERIMENT_KEY)}&anonymousId=${encodeURIComponent(anon)}`;
    fetch(url, { method: 'GET', headers: { accept: 'application/json' } })
      .then((r) => (r.ok ? (r.json() as Promise<AssignmentResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        const assigned = data?.assignments?.[EXPERIMENT_KEY]?.variantKey;
        if (assigned === 'personalized' || assigned === 'control') {
          setVariant(assigned);
        }
        setResolved(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <VariantContext.Provider value={{ variant, resolved, anonymousId }}>
      {children}
      <CartAddConversionTracker
        experimentKey={EXPERIMENT_KEY}
        variantKey={resolved ? variant : null}
        anonymousId={anonymousId}
      />
    </VariantContext.Provider>
  );
}

interface GateProps {
  variant: Variant;
  children: ReactNode;
}

/**
 * Wrapper que mostra `children` apenas quando a variante atribuída do
 * usuário === `variant` da prop. Usa `display:none` para evitar layout
 * shift quando a outra variante for ativada.
 *
 * Antes de o fetch resolver (`resolved=false`): mostra apenas a variante
 * `control` como fallback seguro (sem flash de conteúdo personalizado).
 */
export function HomeVariantGate({ variant, children }: GateProps) {
  const { variant: assigned, resolved } = useContext(VariantContext);
  const effective: Variant = resolved ? assigned : 'control';
  const visible = effective === variant;
  return <div style={{ display: visible ? 'contents' : 'none' }}>{children}</div>;
}
