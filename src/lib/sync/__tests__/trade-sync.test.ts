import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SenateTrade, HouseDisclosure } from "@/lib/fmp/schemas";

vi.mock("@/lib/fmp/client", () => ({
  fetchSenateTrades: vi.fn(),
  fetchHouseDisclosures: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/alerts/alert-service", () => ({
  sendTradeAlerts: vi.fn().mockResolvedValue({ sent: 0, failed: 0 }),
}));

import { fetchSenateTrades, fetchHouseDisclosures } from "@/lib/fmp/client";
import { createServiceClient } from "@/lib/supabase/service";
import { syncTrades } from "../trade-sync";

const mockFetchSenateTrades = vi.mocked(fetchSenateTrades);
const mockFetchHouseDisclosures = vi.mocked(fetchHouseDisclosures);
const mockCreateServiceClient = vi.mocked(createServiceClient);

const SENATE_TRADE: SenateTrade = {
  firstName: "John",
  lastName: "Doe",
  office: "Senate",
  transactionDate: "2024-01-15",
  ticker: "AAPL",
  assetDescription: "Apple Inc",
  assetType: "Stock",
  type: "Purchase",
  amount: "$1,001 - $15,000",
  comment: "test comment",
  link: "https://example.com",
};

const HOUSE_DISCLOSURE: HouseDisclosure = {
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

type FromHandler = (table: string) => unknown;

function buildMockSupabase(handler: FromHandler) {
  return { from: vi.fn().mockImplementation(handler) };
}

function syncRunsSelectNoRunning() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  };
}

function syncRunsSelectHasRunning() {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "existing-run", status: "running" },
            error: null,
          }),
        }),
      }),
    }),
  };
}

function syncRunsInsertOk(id = "run-1") {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id }, error: null }),
      }),
    }),
  };
}

function syncRunsUpdateOk(captureRef?: { value: Record<string, unknown> | null }) {
  return {
    update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      if (captureRef) captureRef.value = data;
      return { eq: vi.fn().mockResolvedValue({ data: null, error: null }) };
    }),
  };
}

function politiciansUpsertOk(id = "pol-1") {
  return {
    upsert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id }, error: null }),
      }),
    }),
  };
}

function tradesInsertOk() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "trade-1",
            politician_id: "pol-1",
            transaction_date: "2024-01-15",
            disclosure_date: null,
            ticker: "AAPL",
            asset_name: "Apple Inc",
            asset_type: "Stock",
            transaction_type: "Purchase",
            amount_range_raw: "$1,001 - $15,000",
            amount_min: 1001,
            amount_max: 15000,
            comment: "test comment",
            source: "fmp",
            created_at: "",
          },
          error: null,
        }),
      }),
    }),
  };
}

function tradesInsertDuplicate() {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "23505", message: "duplicate key value violates unique constraint" },
        }),
      }),
    }),
  };
}

function makeCountingHandler(
  overrides?: {
    trades?: () => unknown;
    operationLog?: string[];
    updateCapture?: { value: Record<string, unknown> | null };
  }
) {
  const counters: Record<string, number> = {};
  return (table: string) => {
    counters[table] = (counters[table] ?? 0) + 1;
    const count = counters[table]!;

    if (table === "sync_runs") {
      if (count === 1) return syncRunsSelectNoRunning();
      if (count === 2) return syncRunsInsertOk();
      return syncRunsUpdateOk(overrides?.updateCapture);
    }
    if (table === "politicians") {
      overrides?.operationLog?.push("upsert_politician");
      return politiciansUpsertOk();
    }
    if (table === "trades") {
      overrides?.operationLog?.push("insert_trade");
      return overrides?.trades ? overrides.trades() : tradesInsertOk();
    }
    return {};
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("syncTrades - senate happy path", () => {
  it("syncs senate trades successfully", async () => {
    const mock = buildMockSupabase(makeCountingHandler());
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchSenateTrades.mockResolvedValue([SENATE_TRADE]);

    const result = await syncTrades("senate");

    expect(result.status).toBe("completed");
    expect(result.tradesFetched).toBe(1);
    expect(result.tradesInserted).toBe(1);
    expect(result.tradesSkipped).toBe(0);
    expect(mockFetchSenateTrades).toHaveBeenCalled();
  });
});

describe("syncTrades - house happy path", () => {
  it("syncs house trades successfully", async () => {
    const mock = buildMockSupabase(makeCountingHandler());
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchHouseDisclosures.mockResolvedValue([HOUSE_DISCLOSURE]);

    const result = await syncTrades("house");

    expect(result.status).toBe("completed");
    expect(result.tradesFetched).toBe(1);
    expect(result.tradesInserted).toBe(1);
    expect(result.tradesSkipped).toBe(0);
    expect(mockFetchHouseDisclosures).toHaveBeenCalled();
  });
});

describe("syncTrades - concurrent run prevention", () => {
  it("aborts when a running sync exists", async () => {
    const mock = buildMockSupabase(() => syncRunsSelectHasRunning());
    mockCreateServiceClient.mockReturnValue(mock as never);

    const result = await syncTrades("senate");

    expect(result.status).toBe("aborted");
    expect(result.tradesFetched).toBe(0);
    expect(mockFetchSenateTrades).not.toHaveBeenCalled();
  });
});

describe("syncTrades - duplicate trade handling", () => {
  it("counts duplicate trades as skipped", async () => {
    const mock = buildMockSupabase(
      makeCountingHandler({ trades: tradesInsertDuplicate })
    );
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchSenateTrades.mockResolvedValue([SENATE_TRADE]);

    const result = await syncTrades("senate");

    expect(result.status).toBe("completed");
    expect(result.tradesInserted).toBe(0);
    expect(result.tradesSkipped).toBe(1);
  });
});

describe("syncTrades - fatal fetch failure", () => {
  it("marks sync run as failed when fetch throws", async () => {
    const updateCapture: { value: Record<string, unknown> | null } = { value: null };
    const mock = buildMockSupabase(makeCountingHandler({ updateCapture }));
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchSenateTrades.mockRejectedValue(new Error("Network failure"));

    const result = await syncTrades("senate");

    expect(result.status).toBe("failed");
    expect(result.errorMessage).toBe("Network failure");
    expect(updateCapture.value).toMatchObject({
      status: "failed",
      error_message: "Network failure",
    });
  });
});

describe("syncTrades - politician upsert and trade insert", () => {
  it("upserts politician before inserting trade", async () => {
    const operations: string[] = [];
    const mock = buildMockSupabase(makeCountingHandler({ operationLog: operations }));
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchSenateTrades.mockResolvedValue([SENATE_TRADE]);

    const result = await syncTrades("senate");

    expect(result.status).toBe("completed");
    expect(operations).toEqual(["upsert_politician", "insert_trade"]);
  });
});

describe("syncTrades - invalid transaction type", () => {
  it("skips trades with unmappable transaction types", async () => {
    const invalidTrade: SenateTrade = { ...SENATE_TRADE, type: "Received" };
    const mock = buildMockSupabase(makeCountingHandler());
    mockCreateServiceClient.mockReturnValue(mock as never);
    mockFetchSenateTrades.mockResolvedValue([invalidTrade]);

    const result = await syncTrades("senate");

    expect(result.status).toBe("completed");
    expect(result.tradesSkipped).toBe(1);
    expect(result.tradesInserted).toBe(0);
  });
});
