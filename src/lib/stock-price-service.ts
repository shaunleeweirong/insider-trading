import { createServiceClient } from "@/lib/supabase/service";
import { fetchStockQuote, fetchHistoricalPrices } from "@/lib/fmp/client";
import type { StockQuote } from "@/lib/fmp/schemas";
import type { StockPrice } from "@/types/database";

const ONE_HOUR_MS = 60 * 60 * 1000;

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

function isFresh(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < ONE_HOUR_MS;
}

function countBusinessDays(from: Date, to: Date): number {
  let count = 0;
  const current = new Date(from);
  while (current <= to) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export async function getStockQuote(ticker: string): Promise<StockQuote | StockPrice | null> {
  const today = todayStr();

  try {
    const supabase = createServiceClient();
    const { data: cached } = await supabase
      .from("stock_prices")
      .select("*")
      .eq("ticker", ticker)
      .eq("date", today)
      .single();

    if (cached && isFresh((cached as StockPrice).created_at)) {
      return cached as StockPrice;
    }

    const quote = await fetchStockQuote(ticker);
    if (!quote) return null;

    const record = {
      ticker: quote.symbol,
      date: today,
      close_price: quote.price,
    };

    await supabase
      .from("stock_prices")
      .upsert(record, { onConflict: "ticker,date" });

    return { ...record, id: "", created_at: new Date().toISOString() };
  } catch {
    return null;
  }
}

export async function getHistoricalPrices(
  ticker: string,
  from: Date,
  to: Date
): Promise<StockPrice[]> {
  const fromStr = formatDate(from);
  const toStr = formatDate(to);

  try {
    const supabase = createServiceClient();
    const { data: cached } = await supabase
      .from("stock_prices")
      .select("*")
      .eq("ticker", ticker)
      .gte("date", fromStr)
      .lte("date", toStr);

    const cachedRows = (cached ?? []) as StockPrice[];
    const expectedDays = countBusinessDays(from, to);

    if (cachedRows.length >= expectedDays && expectedDays > 0) {
      return cachedRows;
    }

    const prices = await fetchHistoricalPrices(ticker, fromStr, toStr);
    if (prices.length === 0) return [];

    const records = prices.map((p) => ({
      ticker,
      date: p.date,
      close_price: p.close,
    }));

    await supabase
      .from("stock_prices")
      .upsert(records, { onConflict: "ticker,date" });

    return records.map((r) => ({
      ...r,
      id: "",
      created_at: new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}
