import { getHistoricalPrices, getStockQuote } from "@/lib/stock-price-service";
import { createServiceClient } from "@/lib/supabase/service";
import type { StockQuote } from "@/lib/fmp/schemas";
import type { Politician, PoliticianReturn, StockPrice, Trade } from "@/types/database";

import {
  buildPortfolio,
  computeReturn,
  getWindowStartDate,
  normalizeTxType,
  type NormalizedTrade,
  type PortfolioResult,
  type PriceMap,
} from "./portfolio-engine";

type ServiceClient = ReturnType<typeof createServiceClient>;

type ComputeReturnsDependencies = {
  createClient?: typeof createServiceClient;
  getHistorical?: typeof getHistoricalPrices;
  getQuote?: typeof getStockQuote;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
  now?: Date;
};

export type ComputePoliticianReturnsResult = PortfolioResult & {
  totalTrades: number;
};

export type ComputeAllReturnsSummary = {
  processed: number;
  skipped: number;
  errors: number;
};

const WINDOWS = ["ytd", "l12m", "l5y"] as const;

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeTrade(trade: Trade): NormalizedTrade | null {
  if (!trade.ticker) {
    return null;
  }

  if (trade.asset_type && /option|call|put/i.test(trade.asset_type)) {
    return null;
  }

  const transactionType = normalizeTxType(trade.transaction_type);

  if (!transactionType || transactionType === "exchange") {
    return null;
  }

  return {
    ticker: trade.ticker,
    transactionDate: trade.transaction_date,
    transactionType,
    amountMin: trade.amount_min ?? 0,
    amountMax: trade.amount_max ?? 0,
  };
}

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function extractCurrentPrice(quote: StockQuote | StockPrice | null): number | undefined {
  if (!quote) {
    return undefined;
  }

  if ("price" in quote && typeof quote.price === "number") {
    return quote.price;
  }

  if ("close_price" in quote && typeof quote.close_price === "number") {
    return quote.close_price;
  }

  return undefined;
}

function buildPriceMap(rowsByTicker: Record<string, StockPrice[]>): PriceMap {
  const priceMap: PriceMap = {};

  for (const [ticker, rows] of Object.entries(rowsByTicker)) {
    priceMap[ticker] = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.date] = row.close_price;
      return acc;
    }, {});
  }

  return priceMap;
}

async function fetchTradesForPolitician(supabase: ServiceClient, politicianId: string) {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("politician_id", politicianId)
    .order("transaction_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Trade[];
}

async function computePoliticianReturnsWithClient(
  supabase: ServiceClient,
  politicianId: string,
  window: (typeof WINDOWS)[number],
  dependencies: ComputeReturnsDependencies = {},
): Promise<ComputePoliticianReturnsResult | null> {
  const getHistorical = dependencies.getHistorical ?? getHistoricalPrices;
  const getQuote = dependencies.getQuote ?? getStockQuote;
  const sleep = dependencies.sleep ?? defaultSleep;
  const now = dependencies.now ?? new Date();

  const trades = await fetchTradesForPolitician(supabase, politicianId);
  const normalizedTrades = trades
    .map(normalizeTrade)
    .filter((trade): trade is NormalizedTrade => trade !== null);

  const cutoff = getWindowStartDate(window, now).toISOString().slice(0, 10);
  const totalTrades = normalizedTrades.filter((trade) => trade.transactionDate >= cutoff).length;

  if (totalTrades < 3 || normalizedTrades.length === 0) {
    return null;
  }

  const uniqueTickers = Array.from(new Set(normalizedTrades.map((trade) => trade.ticker)));
  const earliestTradeDate = normalizedTrades[0]?.transactionDate;

  if (!earliestTradeDate) {
    return null;
  }

  const historicalRowsByTicker: Record<string, StockPrice[]> = {};

  for (const [index, ticker] of uniqueTickers.entries()) {
    if (index > 0) {
      await sleep(200);
    }

    historicalRowsByTicker[ticker] = await getHistorical(ticker, toDate(earliestTradeDate), now);
  }

  const portfolio = buildPortfolio(normalizedTrades, buildPriceMap(historicalRowsByTicker));
  const currentPrices: Record<string, number> = {};

  for (const [index, position] of portfolio.positions.entries()) {
    if (index > 0) {
      await sleep(200);
    }

    const currentPrice = extractCurrentPrice(await getQuote(position.ticker));
    if (currentPrice !== undefined) {
      currentPrices[position.ticker] = currentPrice;
    }
  }

  return {
    ...computeReturn(portfolio, currentPrices),
    totalTrades,
  };
}

export async function computePoliticianReturns(
  politicianId: string,
  window: (typeof WINDOWS)[number],
  dependencies: ComputeReturnsDependencies = {},
): Promise<ComputePoliticianReturnsResult | null> {
  const createClient = dependencies.createClient ?? createServiceClient;
  const supabase = createClient();

  return computePoliticianReturnsWithClient(supabase, politicianId, window, dependencies);
}

export async function computeAllReturns(
  dependencies: ComputeReturnsDependencies = {},
): Promise<ComputeAllReturnsSummary> {
  const createClient = dependencies.createClient ?? createServiceClient;
  const log = dependencies.log ?? console.log;
  const supabase = createClient();

  const { data, error } = await supabase
    .from("politicians")
    .select("id, full_name")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const politicians = (data ?? []) as Pick<Politician, "id" | "full_name">[];
  const summary: ComputeAllReturnsSummary = {
    processed: 0,
    skipped: 0,
    errors: 0,
  };

  for (const [index, politician] of politicians.entries()) {
    log(`Computing returns for ${politician.full_name} (${index + 1}/${politicians.length})...`);

    for (const window of WINDOWS) {
      try {
        const result = await computePoliticianReturnsWithClient(
          supabase,
          politician.id,
          window,
          dependencies,
        );

        if (!result) {
          const { error: deleteError } = await supabase
            .from("politician_returns")
            .delete()
            .eq("politician_id", politician.id)
            .eq("time_window", window);

          if (deleteError) {
            throw new Error(deleteError.message);
          }

          summary.skipped += 1;
          continue;
        }

        const payload: Omit<PoliticianReturn, "id" | "created_at"> & { computed_at: string } = {
          politician_id: politician.id,
          time_window: window,
          total_return_pct: result.totalReturnPct,
          deployed_capital: result.deployedCapital,
          current_value: result.currentValue,
          total_trades: result.totalTrades,
          open_positions: result.openPositions,
          closed_positions: result.closedPositions,
          unresolvable_tickers: result.unresolvableTickers,
          computed_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from("politician_returns")
          .upsert(payload, { onConflict: "politician_id,time_window" });

        if (upsertError) {
          throw new Error(upsertError.message);
        }

        summary.processed += 1;
      } catch {
        summary.errors += 1;
      }
    }
  }

  return summary;
}
