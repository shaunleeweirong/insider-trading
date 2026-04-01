import { getServerEnv } from "@/lib/env";
import {
  senateTradeSchema,
  houseDisclosureSchema,
  stockQuoteSchema,
  historicalPriceSchema,
} from "./schemas";
import type {
  SenateTrade,
  HouseDisclosure,
  StockQuote,
  HistoricalPrice,
} from "./schemas";

const FMP_BASE_URL = "https://financialmodelingprep.com";
const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000] as const;

class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });

      if (response.ok) {
        return response;
      }

      const status = response.status;
      if (status === 429 || status >= 500) {
        lastError = new Error(`FMP API error: ${status}`);
      } else {
        throw new NonRetryableError(`FMP API error: ${status}`);
      }
    } catch (error) {
      if (error instanceof NonRetryableError) {
        throw error;
      }
      lastError = error;
    }

    if (attempt < MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
    }
  }

  throw lastError;
}

function parseArray<T>(
  data: unknown[],
  schema: { safeParse: (item: unknown) => { success: boolean; data?: T; error?: unknown } }
): T[] {
  const results: T[] = [];

  for (const item of data) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      results.push(parsed.data as T);
    } else {
      console.warn("Invalid FMP record skipped:", parsed.error);
    }
  }

  return results;
}

export async function fetchSenateTrades(page = 0): Promise<SenateTrade[]> {
  const apiKey = getServerEnv().FMP_API_KEY;
  const url = `${FMP_BASE_URL}/stable/senate-trading?page=${page}&apikey=${apiKey}`;
  const response = await fetchWithRetry(url);
  const data: unknown = await response.json();

  if (!Array.isArray(data)) return [];
  return parseArray(data, senateTradeSchema);
}

export async function fetchSenateTradesByName(name: string): Promise<SenateTrade[]> {
  const apiKey = getServerEnv().FMP_API_KEY;
  const url = `${FMP_BASE_URL}/stable/senate-trades-by-name/${name}?apikey=${apiKey}`;
  const response = await fetchWithRetry(url);
  const data: unknown = await response.json();

  if (!Array.isArray(data)) return [];
  return parseArray(data, senateTradeSchema);
}

export async function fetchHouseDisclosures(page = 0): Promise<HouseDisclosure[]> {
  const apiKey = getServerEnv().FMP_API_KEY;
  const url = `${FMP_BASE_URL}/stable/house-disclosure?page=${page}&apikey=${apiKey}`;
  const response = await fetchWithRetry(url);
  const data: unknown = await response.json();

  if (!Array.isArray(data)) return [];
  return parseArray(data, houseDisclosureSchema);
}

export async function fetchStockQuote(ticker: string): Promise<StockQuote | null> {
  const apiKey = getServerEnv().FMP_API_KEY;
  const url = `${FMP_BASE_URL}/api/v3/quote/${ticker}?apikey=${apiKey}`;
  const response = await fetchWithRetry(url);
  const data: unknown = await response.json();

  if (!Array.isArray(data) || data.length === 0) return null;

  const parsed = stockQuoteSchema.safeParse(data[0]);
  if (!parsed.success) {
    console.warn("Invalid stock quote:", parsed.error);
    return null;
  }

  return parsed.data;
}

export async function fetchHistoricalPrices(
  ticker: string,
  from: string,
  to: string
): Promise<HistoricalPrice[]> {
  const apiKey = getServerEnv().FMP_API_KEY;
  const url = `${FMP_BASE_URL}/api/v3/historical-price-full/${ticker}?from=${from}&to=${to}&apikey=${apiKey}`;
  const response = await fetchWithRetry(url);
  const data: unknown = await response.json();

  if (typeof data !== "object" || data === null || !("historical" in data)) return [];

  const obj = data as { historical?: unknown };
  if (!Array.isArray(obj.historical)) return [];

  return parseArray(obj.historical, historicalPriceSchema);
}
