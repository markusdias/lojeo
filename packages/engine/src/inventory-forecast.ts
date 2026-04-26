export interface ProductSalesData {
  productId: string;
  productName: string;
  variantId?: string | null;
  sku?: string | null;
  currentStock: number;
  unitsSoldLast30d: number;
  unitsSoldLast90d: number;
  leadTimeDays?: number; // how many days to restock
}

export interface StockForecast {
  productId: string;
  productName: string;
  variantId?: string | null;
  sku?: string | null;
  currentStock: number;
  dailyVelocity: number;      // units/day (30d window, fallback 90d)
  daysUntilStockout: number;  // Infinity if velocity = 0
  reorderPoint: number;       // suggested min stock to trigger reorder
  alert: 'critical' | 'warning' | 'monitor' | 'stable' | 'no_data';
  alertMessage: string;
}

const ALERT_THRESHOLDS = {
  critical: 7,
  warning: 14,
  monitor: 30,
} as const;

function calcAlert(days: number, velocity: number): StockForecast['alert'] {
  if (velocity === 0) return 'no_data';
  if (days <= ALERT_THRESHOLDS.critical) return 'critical';
  if (days <= ALERT_THRESHOLDS.warning) return 'warning';
  if (days <= ALERT_THRESHOLDS.monitor) return 'monitor';
  return 'stable';
}

const ALERT_MESSAGES: Record<StockForecast['alert'], string> = {
  critical: 'Ruptura em ≤7 dias — pedir reposição agora',
  warning: 'Ruptura em 8–14 dias — preparar pedido de reposição',
  monitor: 'Ruptura em 15–30 dias — monitorar',
  stable: 'Estoque suficiente para >30 dias',
  no_data: 'Sem vendas registradas — velocidade não calculável',
};

export function forecastStock(data: ProductSalesData): StockForecast {
  // Prefer 30d velocity; fall back to 90d if insufficient sales
  let dailyVelocity: number;
  if (data.unitsSoldLast30d >= 5) {
    dailyVelocity = data.unitsSoldLast30d / 30;
  } else if (data.unitsSoldLast90d >= 3) {
    dailyVelocity = data.unitsSoldLast90d / 90;
  } else {
    dailyVelocity = 0;
  }

  const daysUntilStockout = dailyVelocity > 0
    ? Math.floor(data.currentStock / dailyVelocity)
    : Infinity;

  const leadTime = data.leadTimeDays ?? 14;
  const reorderPoint = Math.ceil(leadTime * dailyVelocity * 1.2); // 20% safety buffer

  const alert = calcAlert(
    daysUntilStockout === Infinity ? 9999 : daysUntilStockout,
    dailyVelocity,
  );

  return {
    productId: data.productId,
    productName: data.productName,
    variantId: data.variantId,
    sku: data.sku,
    currentStock: data.currentStock,
    dailyVelocity: Math.round(dailyVelocity * 100) / 100,
    daysUntilStockout,
    reorderPoint,
    alert,
    alertMessage: ALERT_MESSAGES[alert],
  };
}

export function forecastStockBatch(items: ProductSalesData[]): StockForecast[] {
  return items
    .map(forecastStock)
    .sort((a, b) => {
      // Sort: critical first, then by days until stockout ascending
      const alertOrder = { critical: 0, warning: 1, monitor: 2, stable: 3, no_data: 4 };
      const diff = alertOrder[a.alert] - alertOrder[b.alert];
      if (diff !== 0) return diff;
      const aDays = a.daysUntilStockout === Infinity ? 9999 : a.daysUntilStockout;
      const bDays = b.daysUntilStockout === Infinity ? 9999 : b.daysUntilStockout;
      return aDays - bDays;
    });
}
