import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({ FMP_API_KEY: "test-key" }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import {
  fetchSenateTrades,
  fetchSenateTradesByName,
  fetchHouseDisclosures,
  fetchStockQuote,
  fetchHistoricalPrices,
} from "../client";

const validSenateTrade = {
  firstName: "John",
  lastName: "Doe",
  office: "Senate",
  transactionDate: "2024-01-15",
  ticker: "AAPL",
  assetDescription: "Apple Inc",
  assetType: "Stock",
  type: "Purchase",
  amount: "$1,001 - $15,000",
  comment: null,
  link: "https://example.com",
};

const validHouseDisclosure = {
  firstName: "Jane",
  lastName: "Smith",
  office: "House",
  transactionDate: "2024-02-20",
  ticker: "GOOGL",
  assetDescription: "Alphabet Inc",
  assetType: "Stock",
  type: "Sale",
  amount: "$15,001 - $50,000",
  comment: null,
  link: "https://example.com",
};

const validStockQuote = {
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 185.5,
  change: 2.3,
  changesPercentage: 1.25,
};

const validHistoricalPrice = {
  date: "2024-01-15",
  close: 185.5,
  high: 186.0,
  low: 184.0,
  open: 184.5,
  volume: 50000000,
};

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function errorResponse(status: number) {
  return Promise.resolve(
    new Response("Error", {
      status,
      headers: { "Content-Type": "text/plain" },
    })
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  mockFetch.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fetchSenateTrades", () => {
  it("fetches and parses senate trades", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validSenateTrade]));

    const result = await fetchSenateTrades();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/api/v4/senate-trading-rss-feed?page=0&apikey=test-key",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validSenateTrade);
  });

  it("passes page parameter", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validSenateTrade]));

    await fetchSenateTrades(3);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/api/v4/senate-trading-rss-feed?page=3&apikey=test-key",
      expect.anything()
    );
  });

  it("maps symbol into ticker for rss feed responses", async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse([{ ...validSenateTrade, ticker: undefined, symbol: "AAPL" }])
    );

    const result = await fetchSenateTrades();

    expect(result[0]?.ticker).toBe("AAPL");
  });

  it("filters out invalid records", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const invalidTrade = { firstName: "Bad" };
    mockFetch.mockReturnValueOnce(
      jsonResponse([validSenateTrade, invalidTrade])
    );

    const result = await fetchSenateTrades();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validSenateTrade);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns empty array for empty response", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([]));

    const result = await fetchSenateTrades();

    expect(result).toHaveLength(0);
  });
});

describe("fetchSenateTradesByName", () => {
  it("fetches trades by name", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validSenateTrade]));

    const result = await fetchSenateTradesByName("John Doe");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/stable/senate-trades-by-name/John Doe?apikey=test-key",
      expect.anything()
    );
    expect(result).toHaveLength(1);
  });
});

describe("fetchHouseDisclosures", () => {
  it("fetches and parses house disclosures", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validHouseDisclosure]));

    const result = await fetchHouseDisclosures();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/stable/house-latest?page=0&limit=100&apikey=test-key",
      expect.anything()
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validHouseDisclosure);
  });

  it("passes page parameter", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validHouseDisclosure]));

    await fetchHouseDisclosures(5);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/stable/house-latest?page=5&limit=100&apikey=test-key",
      expect.anything()
    );
  });

  it("maps representative into first and last names for house rss feed responses", async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse([
        {
          transactionDate: "2024-02-20",
          ticker: "GOOGL",
          assetDescription: "Alphabet Inc",
          type: "Sale",
          amount: "$15,001 - $50,000",
          representative: "Jane Smith",
          link: "https://example.com",
        },
      ])
    );

    const result = await fetchHouseDisclosures();

    expect(result[0]).toMatchObject({
      firstName: "Jane",
      lastName: "Smith",
      office: "Jane Smith",
      ticker: "GOOGL",
    });
  });
});

describe("fetchStockQuote", () => {
  it("fetches and parses stock quote", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([validStockQuote]));

    const result = await fetchStockQuote("AAPL");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=test-key",
      expect.anything()
    );
    expect(result).toEqual(validStockQuote);
  });

  it("returns null when array is empty", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([]));

    const result = await fetchStockQuote("FAKE");

    expect(result).toBeNull();
  });

  it("returns null when quote is invalid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch.mockReturnValueOnce(jsonResponse([{ bad: "data" }]));

    const result = await fetchStockQuote("AAPL");

    expect(result).toBeNull();
    warnSpy.mockRestore();
  });
});

describe("fetchHistoricalPrices", () => {
  it("fetches and parses historical prices", async () => {
    mockFetch.mockReturnValueOnce(
      jsonResponse({ symbol: "AAPL", historical: [validHistoricalPrice] })
    );

    const result = await fetchHistoricalPrices("AAPL", "2024-01-01", "2024-01-31");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://financialmodelingprep.com/api/v3/historical-price-full/AAPL?from=2024-01-01&to=2024-01-31&apikey=test-key",
      expect.anything()
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(validHistoricalPrice);
  });

  it("filters out invalid historical records", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch.mockReturnValueOnce(
      jsonResponse({
        symbol: "AAPL",
        historical: [validHistoricalPrice, { date: "bad" }],
      })
    );

    const result = await fetchHistoricalPrices("AAPL", "2024-01-01", "2024-01-31");

    expect(result).toHaveLength(1);
    warnSpy.mockRestore();
  });

  it("returns empty array when historical is missing", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ symbol: "AAPL" }));

    const result = await fetchHistoricalPrices("AAPL", "2024-01-01", "2024-01-31");

    expect(result).toHaveLength(0);
  });
});

describe("retry logic", () => {
  it("retries on 429 and succeeds", async () => {
    mockFetch
      .mockReturnValueOnce(errorResponse(429))
      .mockReturnValueOnce(errorResponse(429))
      .mockReturnValueOnce(jsonResponse([validSenateTrade]));

    const promise = fetchSenateTrades();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(1);
  });

  it("retries on 500 and succeeds", async () => {
    mockFetch
      .mockReturnValueOnce(errorResponse(500))
      .mockReturnValueOnce(errorResponse(502))
      .mockReturnValueOnce(jsonResponse([validSenateTrade]));

    const promise = fetchSenateTrades();

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(1);
  });

  it("throws after max retries on persistent 429", async () => {
    mockFetch.mockImplementation(async () =>
      new Response("Error", { status: 429 })
    );

    const promise = fetchSenateTrades().catch((error) => error);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const error = await promise;

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("429");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400", async () => {
    mockFetch.mockReturnValueOnce(errorResponse(400));

    await expect(fetchSenateTrades()).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 403", async () => {
    mockFetch.mockReturnValueOnce(errorResponse(403));

    await expect(fetchSenateTrades()).rejects.toThrow();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("timeout handling", () => {
  it("throws on fetch abort after retries exhausted", async () => {
    mockFetch.mockImplementation(async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });

    const promise = fetchSenateTrades().catch((error) => error);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const error = await promise;

    expect(error).toBeInstanceOf(DOMException);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("passes AbortSignal.timeout to fetch", async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([]));

    await fetchSenateTrades();

    const call = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(call[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("network errors", () => {
  it("retries network errors and eventually throws", async () => {
    mockFetch.mockImplementation(async () => {
      throw new TypeError("Failed to fetch");
    });

    const promise = fetchSenateTrades().catch((error) => error);

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    const error = await promise;

    expect(error).toBeInstanceOf(TypeError);
    expect((error as Error).message).toBe("Failed to fetch");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });
});
