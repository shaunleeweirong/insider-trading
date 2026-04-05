import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Trade, Politician } from "@/types/database";
import type { StockPrice } from "@/types/database";

import {
  computeAllReturns,
  computePoliticianReturns,
} from "../compute-returns";

type MockSupabase = {
  from: ReturnType<typeof vi.fn>;
  _upserts: Array<Record<string, unknown>>;
  _deletes: Array<{ politician_id: string; time_window: string }>;
};

const BASE_POLITICIAN: Politician = {
  id: "pol-1",
  full_name: "Jane Doe",
  normalized_name: "jane doe",
  first_name: "Jane",
  last_name: "Doe",
  party: "Democrat",
  chamber: "House",
  state: "CA",
  district: null,
  bioguide_id: null,
  image_url: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function makeTrade(overrides: Partial<Trade>): Trade {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    politician_id: overrides.politician_id ?? "pol-1",
    transaction_date: overrides.transaction_date ?? "2026-01-15",
    disclosure_date: overrides.disclosure_date ?? null,
    ticker: Object.prototype.hasOwnProperty.call(overrides, "ticker")
      ? (overrides.ticker ?? null)
      : "AAPL",
    asset_name: overrides.asset_name ?? "Apple Inc.",
    asset_type: overrides.asset_type ?? "Stock",
    transaction_type: overrides.transaction_type ?? "Purchase",
    amount_range_raw: overrides.amount_range_raw ?? "$1,001 - $15,000",
    amount_min: overrides.amount_min ?? 1001,
    amount_max: overrides.amount_max ?? 15000,
    comment: overrides.comment ?? null,
    source: overrides.source ?? "fmp",
    created_at: overrides.created_at ?? "2026-01-16T00:00:00Z",
  };
}

function createMockSupabase({
  politicians = [BASE_POLITICIAN],
  trades = [],
}: {
  politicians?: Pick<Politician, "id" | "full_name">[];
  trades?: Trade[];
} = {}): MockSupabase {
  const upserts: Array<Record<string, unknown>> = [];
  const deletes: Array<{ politician_id: string; time_window: string }> = [];

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "politicians") {
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: politicians, error: null }),
        }),
      };
    }

    if (table === "trades") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: trades, error: null }),
          }),
        }),
      };
    }

    if (table === "politician_returns") {
      return {
        upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          upserts.push(payload);
          return Promise.resolve({ data: null, error: null });
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((column: string, politicianId: string) => ({
            eq: vi.fn().mockImplementation((timeWindowColumn: string, timeWindow: string) => {
              if (column === "politician_id" && timeWindowColumn === "time_window") {
                deletes.push({ politician_id: politicianId, time_window: timeWindow });
              }

              return Promise.resolve({ data: null, error: null });
            }),
          })),
        }),
      };
    }

    return {};
  });

  return {
    from,
    _upserts: upserts,
    _deletes: deletes,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computePoliticianReturns", () => {
  it("computes a valid result for a politician with sufficient eligible trades", async () => {
    const trades = [
      makeTrade({ transaction_date: "2026-01-02", ticker: "AAPL" }),
      makeTrade({ id: "2", transaction_date: "2026-01-04", ticker: "AAPL" }),
      makeTrade({ id: "3", transaction_date: "2026-01-06", ticker: "MSFT", amount_min: 15001, amount_max: 50000 }),
      makeTrade({ id: "4", transaction_date: "2026-01-08", ticker: "AAPL", transaction_type: "Sale (Partial)" }),
      makeTrade({ id: "5", transaction_date: "2026-01-10", ticker: "MSFT", transaction_type: "Sale (Full)" }),
    ];

    const supabase = createMockSupabase({ trades });

    const result = await computePoliticianReturns("pol-1", "ytd", {
      createClient: () => supabase as never,
      getHistorical: vi.fn(async (ticker: string) => {
        if (ticker === "AAPL") {
          return [
            { id: "", ticker: "AAPL", date: "2026-01-02", close_price: 100, created_at: "" },
            { id: "", ticker: "AAPL", date: "2026-01-04", close_price: 110, created_at: "" },
            { id: "", ticker: "AAPL", date: "2026-01-08", close_price: 120, created_at: "" },
          ] satisfies StockPrice[];
        }

        return [
          { id: "", ticker: "MSFT", date: "2026-01-06", close_price: 200, created_at: "" },
          { id: "", ticker: "MSFT", date: "2026-01-10", close_price: 210, created_at: "" },
        ] satisfies StockPrice[];
      }),
      getQuote: vi.fn(async (ticker: string) => {
        if (ticker === "AAPL") {
          return { symbol: "AAPL", name: "Apple", price: 130, change: 0, changesPercentage: 0 };
        }

        return { symbol: ticker, name: ticker, price: 220, change: 0, changesPercentage: 0 };
      }),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.totalTrades).toBe(5);
    expect(result?.deployedCapital).toBeGreaterThan(0);
    expect(Number.isNaN(result?.totalReturnPct)).toBe(false);
  });

  it("excludes null ticker trades from the trade count and computation", async () => {
    const trades = [
      makeTrade({ id: "1", transaction_date: "2026-01-02", ticker: "AAPL" }),
      makeTrade({ id: "2", transaction_date: "2026-01-04", ticker: null }),
      makeTrade({ id: "3", transaction_date: "2026-01-06", ticker: "MSFT" }),
      makeTrade({ id: "4", transaction_date: "2026-01-08", ticker: null }),
      makeTrade({ id: "5", transaction_date: "2026-01-10", ticker: "NVDA" }),
    ];

    const supabase = createMockSupabase({ trades });
    const getHistorical = vi.fn(async (ticker: string) => [
      { id: "", ticker, date: "2026-01-02", close_price: 100, created_at: "" },
      { id: "", ticker, date: "2026-01-06", close_price: 100, created_at: "" },
      { id: "", ticker, date: "2026-01-10", close_price: 100, created_at: "" },
    ] satisfies StockPrice[]);

    const result = await computePoliticianReturns("pol-1", "ytd", {
      createClient: () => supabase as never,
      getHistorical,
      getQuote: vi.fn(async (ticker: string) => ({ symbol: ticker, name: ticker, price: 110, change: 0, changesPercentage: 0 })),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result?.totalTrades).toBe(3);
    expect(getHistorical).toHaveBeenCalledTimes(3);
    expect(getHistorical).not.toHaveBeenCalledWith(null, expect.anything(), expect.anything());
  });

  it("excludes stock option trades from computation", async () => {
    const trades = [
      makeTrade({ id: "1", transaction_date: "2026-01-02", ticker: "AAPL", asset_type: "Stock" }),
      makeTrade({ id: "2", transaction_date: "2026-01-04", ticker: "MSFT", asset_type: "Stock Option" }),
      makeTrade({ id: "3", transaction_date: "2026-01-06", ticker: "NVDA", asset_type: "Call Option" }),
      makeTrade({ id: "4", transaction_date: "2026-01-08", ticker: "TSLA", asset_type: "Put" }),
      makeTrade({ id: "5", transaction_date: "2026-01-10", ticker: "AMZN", asset_type: "Stock" }),
      makeTrade({ id: "6", transaction_date: "2026-01-12", ticker: "META", asset_type: null }),
    ];

    const supabase = createMockSupabase({ trades });
    const getHistorical = vi.fn(async (ticker: string) => [
      { id: "", ticker, date: "2026-01-02", close_price: 100, created_at: "" },
      { id: "", ticker, date: "2026-01-10", close_price: 100, created_at: "" },
    ] satisfies StockPrice[]);

    const result = await computePoliticianReturns("pol-1", "ytd", {
      createClient: () => supabase as never,
      getHistorical,
      getQuote: vi.fn(async (ticker: string) => ({ symbol: ticker, name: ticker, price: 110, change: 0, changesPercentage: 0 })),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result?.totalTrades).toBe(3);
    expect(getHistorical).toHaveBeenCalledTimes(3);
    expect(getHistorical).toHaveBeenCalledWith("AAPL", expect.any(Date), expect.any(Date));
    expect(getHistorical).toHaveBeenCalledWith("AMZN", expect.any(Date), expect.any(Date));
    expect(getHistorical).toHaveBeenCalledWith("META", expect.any(Date), expect.any(Date));
    expect(getHistorical).not.toHaveBeenCalledWith("MSFT", expect.anything(), expect.anything());
    expect(getHistorical).not.toHaveBeenCalledWith("NVDA", expect.anything(), expect.anything());
    expect(getHistorical).not.toHaveBeenCalledWith("TSLA", expect.anything(), expect.anything());
  });

  it("includes regular stock trades when asset_type is Stock or null", async () => {
    const trades = [
      makeTrade({ id: "1", transaction_date: "2026-01-02", ticker: "AAPL", asset_type: "Stock" }),
      makeTrade({ id: "2", transaction_date: "2026-01-04", ticker: "MSFT", asset_type: null }),
      makeTrade({ id: "3", transaction_date: "2026-01-06", ticker: "NVDA", asset_type: "Common Stock" }),
    ];

    const supabase = createMockSupabase({ trades });
    const getHistorical = vi.fn(async (ticker: string) => [
      { id: "", ticker, date: "2026-01-02", close_price: 100, created_at: "" },
      { id: "", ticker, date: "2026-01-06", close_price: 100, created_at: "" },
    ] satisfies StockPrice[]);

    const result = await computePoliticianReturns("pol-1", "ytd", {
      createClient: () => supabase as never,
      getHistorical,
      getQuote: vi.fn(async (ticker: string) => ({ symbol: ticker, name: ticker, price: 110, change: 0, changesPercentage: 0 })),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result?.totalTrades).toBe(3);
    expect(getHistorical).toHaveBeenCalledTimes(3);
  });

  it("counts unresolved tickers when historical or current prices are missing", async () => {
    const trades = [
      makeTrade({ id: "1", transaction_date: "2026-01-02", ticker: "AAPL" }),
      makeTrade({ id: "2", transaction_date: "2026-01-03", ticker: "MISSING" }),
      makeTrade({ id: "3", transaction_date: "2026-01-04", ticker: "AAPL" }),
    ];

    const supabase = createMockSupabase({ trades });

    const result = await computePoliticianReturns("pol-1", "ytd", {
      createClient: () => supabase as never,
      getHistorical: vi.fn(async (ticker: string) => {
        if (ticker === "MISSING") {
          return [];
        }

        return [
          { id: "", ticker, date: "2026-01-02", close_price: 100, created_at: "" },
          { id: "", ticker, date: "2026-01-04", close_price: 100, created_at: "" },
        ] satisfies StockPrice[];
      }),
      getQuote: vi.fn(async () => null),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
    });

    expect(result).not.toBeNull();
    expect(result?.unresolvableTickers).toBeGreaterThan(0);
  });
});

describe("computeAllReturns", () => {
  it("skips politicians below the minimum trade threshold and deletes stale rows", async () => {
    const politicians = [{ id: "pol-1", full_name: "Jane Doe" }];
    const trades = [
      makeTrade({ id: "1", transaction_date: "2026-01-02" }),
      makeTrade({ id: "2", transaction_date: "2026-01-04" }),
    ];
    const supabase = createMockSupabase({ politicians, trades });

    const result = await computeAllReturns({
      createClient: () => supabase as never,
      getHistorical: vi.fn().mockResolvedValue([]),
      getQuote: vi.fn().mockResolvedValue(null),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
      log: vi.fn(),
    });

    expect(result.processed).toBe(0);
    expect(result.skipped).toBe(3);
    expect(result.errors).toBe(0);
    expect(supabase._upserts).toHaveLength(0);
    expect(supabase._deletes).toEqual([
      { politician_id: "pol-1", time_window: "ytd" },
      { politician_id: "pol-1", time_window: "l12m" },
      { politician_id: "pol-1", time_window: "l5y" },
    ]);
  });

  it("processes all politicians across all three windows and upserts qualifying rows", async () => {
    const politicians = [
      { id: "pol-1", full_name: "Jane Doe" },
      { id: "pol-2", full_name: "John Roe" },
    ];
    const pol1Trades = [
      makeTrade({ id: "1", politician_id: "pol-1", transaction_date: "2026-01-02", ticker: "AAPL" }),
      makeTrade({ id: "2", politician_id: "pol-1", transaction_date: "2026-01-04", ticker: "AAPL" }),
      makeTrade({ id: "3", politician_id: "pol-1", transaction_date: "2026-01-06", ticker: "MSFT" }),
    ];
    const pol2Trades = [
      makeTrade({ id: "4", politician_id: "pol-2", transaction_date: "2026-01-03", ticker: "NVDA" }),
      makeTrade({ id: "5", politician_id: "pol-2", transaction_date: "2026-01-05", ticker: "NVDA" }),
      makeTrade({ id: "6", politician_id: "pol-2", transaction_date: "2026-01-07", ticker: "TSLA" }),
    ];

    const tradeMap = new Map<string, Trade[]>([
      ["pol-1", pol1Trades],
      ["pol-2", pol2Trades],
    ]);

    const supabase = createMockSupabase({ politicians, trades: [] });
    supabase.from = vi.fn().mockImplementation((table: string) => {
      if (table === "politicians") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: politicians, error: null }),
          }),
        };
      }

      if (table === "trades") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((_column: string, politicianId: string) => ({
              order: vi.fn().mockResolvedValue({ data: tradeMap.get(politicianId) ?? [], error: null }),
            })),
          }),
        };
      }

      if (table === "politician_returns") {
        return {
          upsert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            supabase._upserts.push(payload);
            return Promise.resolve({ data: null, error: null });
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockImplementation((column: string, politicianId: string) => ({
              eq: vi.fn().mockImplementation((timeWindowColumn: string, timeWindow: string) => {
                if (column === "politician_id" && timeWindowColumn === "time_window") {
                  supabase._deletes.push({ politician_id: politicianId, time_window: timeWindow });
                }

                return Promise.resolve({ data: null, error: null });
              }),
            })),
          }),
        };
      }

      return {};
    });

    const result = await computeAllReturns({
      createClient: () => supabase as never,
      getHistorical: vi.fn(async (ticker: string) => [
        { id: "", ticker, date: "2026-01-02", close_price: 100, created_at: "" },
        { id: "", ticker, date: "2026-01-04", close_price: 110, created_at: "" },
        { id: "", ticker, date: "2026-01-06", close_price: 120, created_at: "" },
        { id: "", ticker, date: "2026-01-07", close_price: 130, created_at: "" },
      ] satisfies StockPrice[]),
      getQuote: vi.fn(async (ticker: string) => ({ symbol: ticker, name: ticker, price: 140, change: 0, changesPercentage: 0 })),
      sleep: vi.fn().mockResolvedValue(undefined),
      now: new Date("2026-02-01T00:00:00Z"),
      log: vi.fn(),
    });

    expect(result.processed).toBe(6);
    expect(result.skipped).toBe(0);
    expect(result.errors).toBe(0);
    expect(supabase._upserts).toHaveLength(6);
    expect(supabase._upserts[0]).toMatchObject({ politician_id: "pol-1", time_window: "ytd", total_trades: 3 });
  });
});
