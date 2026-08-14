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

function buildAlertMessage(
  symbol: string,
  currentPrice: number,
  targetPrice: number,
  direction: "above" | "below",
  isTriggered: boolean,
  deltaPercent: number
): string {
  if (isTriggered) {
    return `${symbol} reached $${currentPrice.toFixed(2)} (${direction} target $${targetPrice.toFixed(2)})`;
  }
  return `${symbol} is at $${currentPrice.toFixed(2)} (${Math.abs(deltaPercent)}% from target $${targetPrice.toFixed(2)})`;
}

function processSingleAlert(
  alert: Partial<PriceAlert>,
  quote: Quote
): AlertNotification | null {
  if (!alert.symbol || !alert.target_price || alert.target_price <= 0 || quote.price <= 0) {
    return null;
  }

  const direction: "above" | "below" = alert.direction === "below" ? "below" : "above";
  const id = alert.id ?? `${alert.symbol}-${alert.target_price}`;
  const isTriggered =
    (direction === "above" && quote.price >= alert.target_price) ||
    (direction === "below" && quote.price <= alert.target_price);

  const deltaPercent = Number(
    (((quote.price - alert.target_price) / alert.target_price) * 100).toFixed(2)
  );

  const message = buildAlertMessage(
    alert.symbol,
    quote.price,
    alert.target_price,
    direction,
    isTriggered,
    deltaPercent
  );

  return {
    id,
    symbol: alert.symbol,
    targetPrice: alert.target_price,
    currentPrice: quote.price,
    direction,
    deltaPercent,
    message,
    isTriggered,
  };
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
    if (!alert.symbol) continue;
    const quote = quotesMap[alert.symbol];
    if (!quote) continue;

    const notification = processSingleAlert(alert, quote);
    if (notification) {
      if (notification.isTriggered) {
        triggeredCount++;
      }
      notifications.push(notification);
    }
  }

  return {
    notifications,
    triggeredCount,
  };
}
