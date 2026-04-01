import { createServiceClient } from "@/lib/supabase/service";
import { sendTradeAlerts } from "@/lib/alerts/alert-service";
import { fetchSenateTrades, fetchHouseDisclosures } from "@/lib/fmp/client";
import { normalizePoliticianName, parseFirstLast } from "@/lib/normalize-name";
import { parseAmountRange } from "./amount-parser";
import type { SenateTrade, HouseDisclosure } from "@/lib/fmp/schemas";
import type { Trade, TradeTransactionType, Chamber } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SyncResult = {
  status: "completed" | "failed" | "aborted";
  tradesFetched: number;
  tradesInserted: number;
  tradesSkipped: number;
  errorMessage: string | null;
};

export type TradeSyncSource = "senate" | "house";

export type SyncCounts = {
  tradesFetched: number;
  tradesInserted: number;
  tradesSkipped: number;
  insertedTrades: Trade[];
};

const VALID_TRANSACTION_TYPES: Set<string> = new Set([
  "Purchase",
  "Sale",
  "Sale (Partial)",
  "Sale (Full)",
  "Exchange",
]);

const TRANSACTION_TYPE_MAP: Record<string, TradeTransactionType> = {
  purchase: "Purchase",
  sale: "Sale",
  "sale (partial)": "Sale (Partial)",
  "sale (full)": "Sale (Full)",
  "sale_partial": "Sale (Partial)",
  "sale_full": "Sale (Full)",
  exchange: "Exchange",
};

function mapTransactionType(raw: string): TradeTransactionType | null {
  if (VALID_TRANSACTION_TYPES.has(raw)) {
    return raw as TradeTransactionType;
  }
  const mapped = TRANSACTION_TYPE_MAP[raw.toLowerCase()];
  return mapped ?? null;
}

function buildFullName(trade: SenateTrade | HouseDisclosure): string {
  return `${trade.firstName} ${trade.lastName}`;
}

export async function fetchTradePage(
  source: TradeSyncSource,
  page = 0
): Promise<Array<SenateTrade | HouseDisclosure>> {
  return source === "senate"
    ? await fetchSenateTrades(page)
    : await fetchHouseDisclosures(page);
}

export async function syncTradeBatch({
  supabase,
  source,
  records,
}: {
  supabase: SupabaseClient;
  source: TradeSyncSource;
  records: Array<SenateTrade | HouseDisclosure>;
}): Promise<SyncCounts> {
  let tradesInserted = 0;
  let tradesSkipped = 0;
  const insertedTrades: Trade[] = [];
  const tradesFetched = records.length;
  const chamber: Chamber = source === "senate" ? "Senate" : "House";

  for (const record of records) {
    try {
      const transactionType = mapTransactionType(record.type);
      if (!transactionType) {
        tradesSkipped++;
        continue;
      }

      const fullName = buildFullName(record);
      const normalizedName = normalizePoliticianName(fullName);
      const { firstName, lastName } = parseFirstLast(fullName);

      const { data: politician } = await supabase
        .from("politicians")
        .upsert(
          {
            full_name: fullName,
            normalized_name: normalizedName,
            first_name: firstName,
            last_name: lastName,
            chamber,
            is_active: true,
          },
          { onConflict: "normalized_name" }
        )
        .select("id")
        .single();

      const politicianId = (politician as { id: string } | null)?.id;
      if (!politicianId) {
        tradesSkipped++;
        continue;
      }

      const { min, max } = parseAmountRange(record.amount);

      const tradePayload = {
        politician_id: politicianId,
        transaction_date: record.transactionDate,
        ticker: record.ticker ?? null,
        asset_name: record.assetDescription,
        asset_type: record.assetType ?? null,
        transaction_type: transactionType,
        amount_range_raw: record.amount,
        amount_min: min,
        amount_max: max,
        comment: record.comment ?? null,
        source: "fmp",
      };

      const { data: insertedTrade, error: insertError } = await supabase
        .from("trades")
        .insert(tradePayload)
        .select("*")
        .single();

      if (insertError) {
        const isDuplicate =
          (insertError as { code?: string }).code === "23505" ||
          (insertError as { message?: string }).message?.includes("duplicate");
        if (isDuplicate) {
          tradesSkipped++;
        } else {
          tradesSkipped++;
        }
      } else {
        tradesInserted++;
        if (insertedTrade) {
          insertedTrades.push(insertedTrade as Trade);
        }
      }
    } catch {
      tradesSkipped++;
    }
  }

  return {
    tradesFetched,
    tradesInserted,
    tradesSkipped,
    insertedTrades,
  };
}

export async function syncTrades(source: TradeSyncSource): Promise<SyncResult> {
  const supabase = createServiceClient();
  let syncRunId: string | null = null;
  let tradesFetched = 0;
  let tradesInserted = 0;
  let tradesSkipped = 0;

  try {
    const { data: existingRun } = await supabase
      .from("sync_runs")
      .select("id")
      .eq("status", "running")
      .eq("source", "fmp")
      .maybeSingle();

    if (existingRun) {
      return {
        status: "aborted",
        tradesFetched: 0,
        tradesInserted: 0,
        tradesSkipped: 0,
        errorMessage: null,
      };
    }

    const { data: newRun } = await supabase
      .from("sync_runs")
      .insert({
        source: "fmp",
        status: "running",
        started_at: new Date().toISOString(),
        trades_fetched: 0,
        trades_inserted: 0,
        trades_skipped: 0,
      })
      .select("id")
      .single();

    syncRunId = (newRun as { id: string } | null)?.id ?? null;

    const counts = await syncTradeBatch({
      supabase,
      source,
      records: await fetchTradePage(source),
    });

    tradesFetched = counts.tradesFetched;
    tradesInserted = counts.tradesInserted;
    tradesSkipped = counts.tradesSkipped;

    if (counts.insertedTrades.length > 0) {
      await sendTradeAlerts(counts.insertedTrades);
    }

    if (syncRunId) {
      await supabase
        .from("sync_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          trades_fetched: tradesFetched,
          trades_inserted: tradesInserted,
          trades_skipped: tradesSkipped,
        })
        .eq("id", syncRunId);
    }

    return {
      status: "completed",
      tradesFetched,
      tradesInserted,
      tradesSkipped,
      errorMessage: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (syncRunId) {
      await supabase
        .from("sync_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          trades_fetched: tradesFetched,
          trades_inserted: tradesInserted,
          trades_skipped: tradesSkipped,
          error_message: message,
        })
        .eq("id", syncRunId);
    }

    return {
      status: "failed",
      tradesFetched,
      tradesInserted,
      tradesSkipped,
      errorMessage: message,
    };
  }
}
