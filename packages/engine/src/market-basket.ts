/**
 * Market basket analysis — pure functions to find frequently-bought-together pairs.
 *
 * Input: lista de pedidos (`orderId → productIds[]`)
 * Output: pares (a, b) com score baseado em coocorrência + lift (associação > random)
 *
 * Lift = P(B|A) / P(B) = (count(A∩B) / count(A)) / (count(B) / total)
 * Lift > 1 = associação positiva (compram juntos mais que o esperado)
 * Lift = 1 = independente
 * Lift < 1 = anti-correlacionado
 */

export interface Order {
  orderId: string;
  productIds: string[];
}

export interface ProductPair {
  productId: string;
  recommendedProductId: string;
  cooccurrence: number; // count de pedidos com ambos
  productCount: number; // count de pedidos com productId
  recommendedCount: number; // count de pedidos com recommendedProductId
  support: number; // cooccurrence / total
  confidence: number; // P(B|A) = cooccurrence / productCount
  lift: number; // confidence / P(B)
  score: number; // ranking final (lift × log(cooccurrence + 1))
}

/**
 * Computa pares frequentemente comprados juntos.
 *
 * @param orders Lista de pedidos com productIds
 * @param minCooccurrence Mínimo de pedidos compartilhados para um par ser considerado (default 2)
 * @returns Map productId → top N pares ordenados por score desc
 */
export function computeFrequentPairs(
  orders: Order[],
  minCooccurrence = 2,
): ProductPair[] {
  const total = orders.length;
  if (total === 0) return [];

  // Count product appearances and cooccurrences
  const productCount = new Map<string, number>();
  const pairCount = new Map<string, number>(); // key = `${a}__${b}` (a < b lexico)

  for (const order of orders) {
    const unique = Array.from(new Set(order.productIds));
    for (const p of unique) {
      productCount.set(p, (productCount.get(p) ?? 0) + 1);
    }
    // Pares (combinações sem repetição)
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const a = unique[i]!;
        const b = unique[j]!;
        const key = a < b ? `${a}__${b}` : `${b}__${a}`;
        pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs: ProductPair[] = [];

  for (const [key, cooc] of pairCount) {
    if (cooc < minCooccurrence) continue;
    const [a, b] = key.split('__') as [string, string];
    const aCount = productCount.get(a) ?? 0;
    const bCount = productCount.get(b) ?? 0;
    if (aCount === 0 || bCount === 0) continue;

    const support = cooc / total;
    const confidenceAB = cooc / aCount;
    const confidenceBA = cooc / bCount;
    const probA = aCount / total;
    const probB = bCount / total;
    const liftAB = probB > 0 ? confidenceAB / probB : 0;
    const liftBA = probA > 0 ? confidenceBA / probA : 0;
    const scoreFactor = Math.log(cooc + 1);

    // Two directional pairs
    pairs.push({
      productId: a,
      recommendedProductId: b,
      cooccurrence: cooc,
      productCount: aCount,
      recommendedCount: bCount,
      support,
      confidence: confidenceAB,
      lift: liftAB,
      score: liftAB * scoreFactor,
    });
    pairs.push({
      productId: b,
      recommendedProductId: a,
      cooccurrence: cooc,
      productCount: bCount,
      recommendedCount: aCount,
      support,
      confidence: confidenceBA,
      lift: liftBA,
      score: liftBA * scoreFactor,
    });
  }

  return pairs.sort((a, b) => b.score - a.score);
}

/**
 * Top N recomendações para um produto específico.
 */
export function topPairsForProduct(pairs: ProductPair[], productId: string, n = 4): ProductPair[] {
  return pairs.filter(p => p.productId === productId).slice(0, n);
}
