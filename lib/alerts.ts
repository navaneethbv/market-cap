import type { Quote } from "@/lib/market/types";

export type AlertDirection = "above" | "below";
export type AlertStatus = "watching" | "triggered" | "paused" | "unavailable";

export type PriceAlert = {
  id: string;
  symbol: string;
  direction: AlertDirection;
  target_price: number;
  active: boolean;
  triggered_at: string | null;
  created_at: string;
  notify_email: boolean;
  webhook_url: string | null;
};

export type AlertInput = {
  symbol: string;
  direction: string;
  targetPrice: string;
  notifyEmail?: string | boolean;
  webhookUrl?: string;
};

export type NormalizedAlertInput = {
  symbol: string;
  direction: AlertDirection;
  targetPrice: number;
  notifyEmail: boolean;
  webhookUrl: string | null;
};

export type AlertEvaluation = {
  status: AlertStatus;
  isTriggered: boolean;
  distance: number | null;
  distancePercent: number | null;
};

export type AlertRow = {
  id: string;
  symbol: string;
  direction: AlertDirection;
  targetPrice: number;
  active: boolean;
  triggeredAt: string | null;
  createdAt: string;
  notifyEmail: boolean;
  webhookUrl: string | null;
  quote: Quote | null;
  status: AlertStatus;
  isTriggered: boolean;
  distance: number | null;
  distancePercent: number | null;
  error: string | null;
};

const SYMBOL_PATTERN = /^[A-Z0-9.^-]{1,12}$/;

export function normalizeAlertInput(input: AlertInput): NormalizedAlertInput {
  const symbol = input.symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(symbol)) {
    throw new Error("Invalid symbol");
  }

  if (input.direction !== "above" && input.direction !== "below") {
    throw new Error("Invalid alert direction");
  }

  const targetPrice = Number(input.targetPrice);
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    throw new Error("Target price must be greater than zero");
  }

  const notifyEmail = input.notifyEmail !== undefined
    ? (typeof input.notifyEmail === "boolean"
      ? input.notifyEmail
      : String(input.notifyEmail) === "true")
    : false;

  const webhookUrl = input.webhookUrl?.trim() || null;

  return {
    symbol,
    direction: input.direction,
    targetPrice,
    notifyEmail,
    webhookUrl,
  };
}

export function evaluatePriceAlert(
  alert: Pick<PriceAlert, "active" | "direction" | "target_price">,
  quote: Quote | null
): AlertEvaluation {
  if (!alert.active) {
    return {
      status: "paused",
      isTriggered: false,
      distance: null,
      distancePercent: null,
    };
  }

  if (!quote) {
    return {
      status: "unavailable",
      isTriggered: false,
      distance: null,
      distancePercent: null,
    };
  }

  const signedDistance =
    alert.direction === "above"
      ? quote.price - alert.target_price
      : alert.target_price - quote.price;
  const isTriggered = signedDistance >= 0;
  const distance = Math.abs(quote.price - alert.target_price);
  const distancePercent = (distance / alert.target_price) * 100;

  return {
    status: isTriggered ? "triggered" : "watching",
    isTriggered,
    distance,
    distancePercent,
  };
}

function getReasonMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "Quote unavailable";
}

export function buildAlertRows(
  alerts: PriceAlert[],
  quoteResults: PromiseSettledResult<Quote>[]
): AlertRow[] {
  return alerts.map((alert, index) => {
    const result = quoteResults[index];
    const quote = result?.status === "fulfilled" ? result.value : null;
    const evaluation = evaluatePriceAlert(alert, quote);

    return {
      id: alert.id,
      symbol: alert.symbol,
      direction: alert.direction,
      targetPrice: alert.target_price,
      active: alert.active,
      triggeredAt: alert.triggered_at,
      createdAt: alert.created_at,
      notifyEmail: alert.notify_email || false,
      webhookUrl: alert.webhook_url,
      quote,
      ...evaluation,
      error:
        result?.status === "rejected" ? getReasonMessage(result.reason) : null,
    };
  });
}

export function calculateAlertSummary(rows: AlertRow[]) {
  return rows.reduce(
    (summary, row) => {
      summary.totalCount++;
      if (row.active) {
        summary.activeCount++;
      }
      if (row.status === "triggered") {
        summary.triggeredCount++;
      }
      if (row.status === "paused") {
        summary.pausedCount++;
      }
      if (row.status === "unavailable") {
        summary.unavailableCount++;
      }
      return summary;
    },
    {
      totalCount: 0,
      activeCount: 0,
      triggeredCount: 0,
      pausedCount: 0,
      unavailableCount: 0,
    }
  );
}
