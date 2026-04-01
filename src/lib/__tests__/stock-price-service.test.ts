import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StockQuote, HistoricalPrice } from "@/lib/fmp/schemas";
import type { StockPrice } from "@/types/database";

vi.mock("@/lib/fmp/client", () => ({
  fetchStockQuote: vi.fn(),
  fetchHistoricalPrices: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

import { fetchStockQuote, fetchHistoricalPrices } from "@/lib/fmp/client";
import { createServiceClient } from "@/lib/supabase/service";
import { getStockQuote, getHistoricalPrices } from "@/lib/stock-price-service";

const mockFetchStockQuote = vi.mocked(fetchStockQuote);
const mockFetchHistoricalPrices = vi.mocked(fetchHistoricalPrices);
const mockCreateServiceClient = vi.mocked(createServiceClient);

function createMockSupabase() {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.lte = vi.fn().mockReturnValue({ data: [], error: null });
  chain.gte = vi.fn();
  chain.eq = vi.fn();
  chain.select = vi.fn();
  chain.upsert = vi.fn().mockResolvedValue({ error: null });
  chain.from = vi.fn();

  const eqResult = () => ({
    eq: chain.eq,
    gte: chain.gte,
    lte: chain.lte,
    single: chain.single,
  });
  chain.eq.mockImplementation(() => eqResult());
  chain.gte.mockImplementation(() => ({ gte: chain.gte, lte: chain.lte }));
  chain.select.mockImplementation(() => ({
    eq: chain.eq,
    gte: chain.gte,
    lte: chain.lte,
  }));
  chain.from.mockImplementation(() => ({
    select: chain.select,
    upsert: chain.upsert,
  }));

  return { from: chain.from, _chain: chain };
}

const MOCK_QUOTE: StockQuote = {
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 195.5,
  change: 2.3,
  changesPercentage: 1.19,
};

const MOCK_HISTORICAL: HistoricalPrice[] = [
  { date: "2024-01-15", close: 190.0, high: 192.0, low: 189.0, open: 190.5, volume: 50000000 },
  { date: "2024-01-16", close: 191.5, high: 193.0, low: 190.0, open: 191.0, volume: 48000000 },
];

const TODAY = new Date().toISOString().split("T")[0]!;

function makeCachedStockPrice(overrides: Partial<StockPrice> = {}): StockPrice {
  return {
    id: "sp-1",
    ticker: "AAPL",
    date: TODAY,
    close_price: 195.5,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("getStockQuote", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupa as never);
  });

  it("returns cached data when cache hit is fresh (< 1 hour)", async () => {
    const cached = makeCachedStockPrice();
    mockSupa._chain.single!.mockResolvedValue({ data: cached, error: null });

    const result = await getStockQuote("AAPL");

    expect(result).toEqual(cached);
    expect(mockFetchStockQuote).not.toHaveBeenCalled();
    expect(mockSupa._chain.upsert).not.toHaveBeenCalled();
  });

  it("fetches from FMP and upserts on cache miss", async () => {
    mockSupa._chain.single!.mockResolvedValue({ data: null, error: null });
    mockFetchStockQuote.mockResolvedValue(MOCK_QUOTE);
    mockSupa._chain.upsert!.mockResolvedValue({ error: null });

    const result = await getStockQuote("AAPL");

    expect(mockFetchStockQuote).toHaveBeenCalledWith("AAPL");
    expect(mockSupa._chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ticker: "AAPL",
        date: TODAY,
        close_price: 195.5,
      }),
      expect.objectContaining({ onConflict: "ticker,date" })
    );
    expect(result).toMatchObject({
      ticker: "AAPL",
      date: TODAY,
      close_price: 195.5,
    });
  });

  it("fetches from FMP when cache is stale (> 1 hour)", async () => {
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const stale = makeCachedStockPrice({ created_at: staleTime });
    mockSupa._chain.single!.mockResolvedValue({ data: stale, error: null });
    mockFetchStockQuote.mockResolvedValue(MOCK_QUOTE);
    mockSupa._chain.upsert!.mockResolvedValue({ error: null });

    const result = await getStockQuote("AAPL");

    expect(mockFetchStockQuote).toHaveBeenCalledWith("AAPL");
    expect(result).toMatchObject({ ticker: "AAPL", close_price: 195.5 });
  });

  it("returns null for unknown ticker", async () => {
    mockSupa._chain.single!.mockResolvedValue({ data: null, error: null });
    mockFetchStockQuote.mockResolvedValue(null);

    const result = await getStockQuote("XYZZZ");

    expect(result).toBeNull();
    expect(mockSupa._chain.upsert).not.toHaveBeenCalled();
  });

  it("returns null when FMP throws an error", async () => {
    mockSupa._chain.single!.mockResolvedValue({ data: null, error: null });
    mockFetchStockQuote.mockRejectedValue(new Error("FMP API error: 500"));

    const result = await getStockQuote("AAPL");

    expect(result).toBeNull();
  });
});

describe("getHistoricalPrices", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
    mockCreateServiceClient.mockReturnValue(mockSupa as never);
  });

  it("returns cached data when all dates are present", async () => {
    const cached: StockPrice[] = [
      makeCachedStockPrice({ date: "2024-01-15", close_price: 190.0 }),
      makeCachedStockPrice({ date: "2024-01-16", close_price: 191.5 }),
    ];
    mockSupa._chain.lte!.mockReturnValue({ data: cached, error: null });

    const from = new Date("2024-01-15");
    const to = new Date("2024-01-16");
    const result = await getHistoricalPrices("AAPL", from, to);

    expect(result).toEqual(cached);
    expect(mockFetchHistoricalPrices).not.toHaveBeenCalled();
  });

  it("fetches from FMP and upserts on cache miss", async () => {
    mockSupa._chain.lte!.mockReturnValue({ data: [], error: null });
    mockFetchHistoricalPrices.mockResolvedValue(MOCK_HISTORICAL);
    mockSupa._chain.upsert!.mockResolvedValue({ error: null });

    const from = new Date("2024-01-15");
    const to = new Date("2024-01-16");
    const result = await getHistoricalPrices("AAPL", from, to);

    expect(mockFetchHistoricalPrices).toHaveBeenCalledWith("AAPL", "2024-01-15", "2024-01-16");
    expect(mockSupa._chain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ ticker: "AAPL", date: "2024-01-15", close_price: 190.0 }),
        expect.objectContaining({ ticker: "AAPL", date: "2024-01-16", close_price: 191.5 }),
      ]),
      expect.objectContaining({ onConflict: "ticker,date" })
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ ticker: "AAPL", date: "2024-01-15", close_price: 190.0 });
  });

  it("fetches from FMP when cache is partial", async () => {
    const cached: StockPrice[] = [
      makeCachedStockPrice({ date: "2024-01-15", close_price: 190.0 }),
    ];
    mockSupa._chain.lte!.mockReturnValue({ data: cached, error: null });
    mockFetchHistoricalPrices.mockResolvedValue(MOCK_HISTORICAL);
    mockSupa._chain.upsert!.mockResolvedValue({ error: null });

    const from = new Date("2024-01-15");
    const to = new Date("2024-01-16");
    const result = await getHistoricalPrices("AAPL", from, to);

    expect(mockFetchHistoricalPrices).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("returns empty array when FMP returns no data", async () => {
    mockSupa._chain.lte!.mockReturnValue({ data: [], error: null });
    mockFetchHistoricalPrices.mockResolvedValue([]);

    const from = new Date("2024-01-15");
    const to = new Date("2024-01-16");
    const result = await getHistoricalPrices("AAPL", from, to);

    expect(result).toEqual([]);
  });

  it("returns empty array when FMP throws an error", async () => {
    mockSupa._chain.lte!.mockReturnValue({ data: [], error: null });
    mockFetchHistoricalPrices.mockRejectedValue(new Error("Network error"));

    const from = new Date("2024-01-15");
    const to = new Date("2024-01-16");
    const result = await getHistoricalPrices("AAPL", from, to);

    expect(result).toEqual([]);
  });
});
