import { getMidpoint } from "./midpoint";

export type NormalizedTrade = {
  ticker: string;
  transactionDate: string;
  transactionType: "purchase" | "sale" | "sale_partial" | "sale_full" | "exchange";
  amountMin: number;
  amountMax: number;
};

export type PriceMap = Record<string, Record<string, number>>;

export type Position = {
  ticker: string;
  shares: number;
  costBasis: number;
  openDate: string;
};

export type PortfolioBuildResult = {
  positions: Position[];
  realizedProceeds: number;
  deployedCapital: number;
  closedPositions: number;
  unresolvableTickers: number;
};

export type PortfolioResult = {
  totalReturnPct: number;
  deployedCapital: number;
  currentValue: number;
  realizedProceeds: number;
  totalValue: number;
  openPositions: number;
  closedPositions: number;
  unresolvableTickers: number;
};

const TX_TYPE_MAP: Record<string, NormalizedTrade["transactionType"] | null> = {
  "Purchase": "purchase",
  "Sale": "sale",
  "Sale (Partial)": "sale_partial",
  "Sale (Full)": "sale_full",
  "Exchange": "exchange",
};

/**
 * Resolve the closest price on or before `date`. Walks backwards up to 7
 * calendar days to handle weekends/holidays where markets are closed.
 */
function resolvePrice(
  tickerPrices: Record<string, number> | undefined,
  date: string,
): number | undefined {
  if (!tickerPrices) return undefined;

  const exact = tickerPrices[date];
  if (exact !== undefined) return exact;

  const d = new Date(date + "T00:00:00Z");
  for (let i = 1; i <= 7; i++) {
    d.setUTCDate(d.getUTCDate() - 1);
    const key =
      d.getUTCFullYear().toString() +
      "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getUTCDate()).padStart(2, "0");
    const p = tickerPrices[key];
    if (p !== undefined) return p;
  }

  return undefined;
}

export function normalizeTxType(
  raw: string,
): NormalizedTrade["transactionType"] | null {
  return TX_TYPE_MAP[raw] ?? null;
}

export function buildPortfolio(
  trades: NormalizedTrade[],
  priceMap: PriceMap,
): PortfolioBuildResult {
  const positions = new Map<string, Position>();
  let realizedProceeds = 0;
  let deployedCapital = 0;
  let closedPositions = 0;
  let unresolvableTickers = 0;

  for (const trade of trades) {
    if (trade.transactionType === "exchange") continue;

    const tickerPrices = priceMap[trade.ticker];
    const priceOnDate = resolvePrice(tickerPrices, trade.transactionDate);

    if (priceOnDate === undefined || priceOnDate <= 0) {
      unresolvableTickers++;
      continue;
    }

    const midpoint = getMidpoint(trade.amountMin, trade.amountMax);

    if (trade.transactionType === "purchase") {
      const sharesBought = midpoint / priceOnDate;
      const existing = positions.get(trade.ticker);
      if (existing) {
        existing.shares += sharesBought;
        existing.costBasis += midpoint;
      } else {
        positions.set(trade.ticker, {
          ticker: trade.ticker,
          shares: sharesBought,
          costBasis: midpoint,
          openDate: trade.transactionDate,
        });
      }
      deployedCapital += midpoint;
    } else if (
      trade.transactionType === "sale_full" ||
      trade.transactionType === "sale"
    ) {
      const existing = positions.get(trade.ticker);
      if (existing) {
        realizedProceeds += existing.shares * priceOnDate;
        positions.delete(trade.ticker);
        closedPositions++;
      }
    } else if (trade.transactionType === "sale_partial") {
      const existing = positions.get(trade.ticker);
      if (existing) {
        const estimatedSharesSold = Math.min(
          midpoint / priceOnDate,
          existing.shares,
        );
        realizedProceeds += estimatedSharesSold * priceOnDate;
        existing.shares -= estimatedSharesSold;

        if (existing.shares <= 0) {
          positions.delete(trade.ticker);
          closedPositions++;
        }
      }
    }
  }

  return {
    positions: Array.from(positions.values()),
    realizedProceeds,
    deployedCapital,
    closedPositions,
    unresolvableTickers,
  };
}

export function computeReturn(
  portfolio: PortfolioBuildResult,
  currentPrices: Record<string, number>,
): PortfolioResult {
  let currentValue = 0;
  let unresolvableTickers = portfolio.unresolvableTickers;

  for (const pos of portfolio.positions) {
    const price = currentPrices[pos.ticker];
    if (price !== undefined && price > 0) {
      currentValue += pos.shares * price;
    } else {
      unresolvableTickers++;
    }
  }

  const totalValue = currentValue + portfolio.realizedProceeds;
  const { deployedCapital } = portfolio;

  const totalReturnPct =
    deployedCapital > 0
      ? ((totalValue - deployedCapital) / deployedCapital) * 100
      : 0;

  return {
    totalReturnPct,
    deployedCapital,
    currentValue,
    realizedProceeds: portfolio.realizedProceeds,
    totalValue,
    openPositions: portfolio.positions.length,
    closedPositions: portfolio.closedPositions,
    unresolvableTickers,
  };
}

export function getWindowStartDate(
  window: "ytd" | "l12m" | "l5y",
  now?: Date,
): Date {
  const ref = now ?? new Date();

  switch (window) {
    case "ytd":
      return new Date(Date.UTC(ref.getFullYear(), 0, 1));
    case "l12m": {
      const d = new Date(ref);
      d.setMonth(d.getMonth() - 12);
      return d;
    }
    case "l5y": {
      const d = new Date(ref);
      d.setFullYear(d.getFullYear() - 5);
      return d;
    }
  }
}
