import type { PriceAlert } from "./alerts.ts";
import type { Quote } from "./market/types";

export interface AlertNotification {
  id: string;
  symbol: string;
  targetPrice: number;
  currentPrice: number;
  direction: "above" | "below";
  deltaPercent: number;
  message: string;
  isTriggered: boolean;
}

export function evaluateAlertNotifications(
  alerts: readonly Partial<PriceAlert>[],
  quotesMap: Readonly<Record<string, Quote | null | undefined>>
): {
  notifications: AlertNotification[];
  triggeredCount: number;
} {
  const notifications: AlertNotification[] = [];
  let triggeredCount = 0;

  for (const alert of alerts) {
    if (!alert.symbol || !alert.target_price || alert.target_price <= 0) continue;
    const quote = quotesMap[alert.symbol];
    if (!quote || quote.price <= 0) continue;

    const direction = alert.direction === "below" ? "below" : "above";
    const id = alert.id ?? `${alert.symbol}-${alert.target_price}`;
    const isAboveTriggered = direction === "above" && quote.price >= alert.target_price;
    const isBelowTriggered = direction === "below" && quote.price <= alert.target_price;
    const isTriggered = isAboveTriggered || isBelowTriggered;

    const deltaPercent = Number(
      (((quote.price - alert.target_price) / alert.target_price) * 100).toFixed(2)
    );

    if (isTriggered) {
      triggeredCount++;
    }

    const message = isTriggered
      ? `${alert.symbol} reached $${quote.price.toFixed(2)} (${direction === "above" ? "above" : "below"} target $${alert.target_price.toFixed(2)})`
      : `${alert.symbol} is at $${quote.price.toFixed(2)} (${Math.abs(deltaPercent)}% from target $${alert.target_price.toFixed(2)})`;

    notifications.push({
      id,
      symbol: alert.symbol,
      targetPrice: alert.target_price,
      currentPrice: quote.price,
      direction,
      deltaPercent,
      message,
      isTriggered,
    });
  }

  return {
    notifications,
    triggeredCount,
  };
}
