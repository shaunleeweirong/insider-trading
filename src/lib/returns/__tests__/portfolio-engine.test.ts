import { describe, it, expect } from "vitest";

import {
  normalizeTxType,
  buildPortfolio,
  computeReturn,
  getWindowStartDate,
} from "../portfolio-engine";
import type {
  NormalizedTrade,
  PriceMap,
  PortfolioBuildResult,
} from "../portfolio-engine";

function makeTrade(
  overrides: Partial<NormalizedTrade> & { ticker: string },
): NormalizedTrade {
  return {
    transactionDate: "2024-01-15",
    transactionType: "purchase",
    amountMin: 1001,
    amountMax: 15000,
    ...overrides,
  };
}

describe("normalizeTxType", () => {
  it("maps Purchase to purchase", () => {
    expect(normalizeTxType("Purchase")).toBe("purchase");
  });

  it("maps Sale to sale", () => {
    expect(normalizeTxType("Sale")).toBe("sale");
  });

  it("maps Sale (Partial) to sale_partial", () => {
    expect(normalizeTxType("Sale (Partial)")).toBe("sale_partial");
  });

  it("maps Sale (Full) to sale_full", () => {
    expect(normalizeTxType("Sale (Full)")).toBe("sale_full");
  });

  it("maps Exchange to exchange", () => {
    expect(normalizeTxType("Exchange")).toBe("exchange");
  });

  it("returns null for unknown types", () => {
    expect(normalizeTxType("Received")).toBeNull();
    expect(normalizeTxType("Exercise")).toBeNull();
    expect(normalizeTxType("")).toBeNull();
  });
});

describe("buildPortfolio", () => {
  it("handles a single purchase", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({ ticker: "AAPL", amountMin: 1001, amountMax: 15000 }),
    ];
    const priceMap: PriceMap = { AAPL: { "2024-01-15": 150 } };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0]!.ticker).toBe("AAPL");
    expect(result.positions[0]!.shares).toBeCloseTo(8000.5 / 150);
    expect(result.deployedCapital).toBeCloseTo(8000.5);
    expect(result.realizedProceeds).toBe(0);
    expect(result.closedPositions).toBe(0);
    expect(result.unresolvableTickers).toBe(0);
  });

  it("handles sale_full — closes position and records realized proceeds", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-01-15",
        transactionType: "purchase",
        amountMin: 1001,
        amountMax: 15000,
      }),
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-06-15",
        transactionType: "sale_full",
        amountMin: 1001,
        amountMax: 15000,
      }),
    ];
    const priceMap: PriceMap = {
      AAPL: { "2024-01-15": 150, "2024-06-15": 200 },
    };

    const result = buildPortfolio(trades, priceMap);

    const sharesBought = 8000.5 / 150;
    expect(result.positions).toHaveLength(0);
    expect(result.realizedProceeds).toBeCloseTo(sharesBought * 200);
    expect(result.deployedCapital).toBeCloseTo(8000.5);
    expect(result.closedPositions).toBe(1);
  });

  it("handles sale_partial — reduces position and records partial proceeds", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "MSFT",
        transactionDate: "2024-01-10",
        transactionType: "purchase",
        amountMin: 15001,
        amountMax: 50000,
      }),
      makeTrade({
        ticker: "MSFT",
        transactionDate: "2024-06-15",
        transactionType: "sale_partial",
        amountMin: 1001,
        amountMax: 15000,
      }),
    ];
    const priceMap: PriceMap = {
      MSFT: { "2024-01-10": 350, "2024-06-15": 420 },
    };

    const result = buildPortfolio(trades, priceMap);

    const sharesBought = 32500.5 / 350;
    const sharesSold = Math.min(8000.5 / 420, sharesBought);
    const remainingShares = sharesBought - sharesSold;

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0]!.shares).toBeCloseTo(remainingShares);
    expect(result.realizedProceeds).toBeCloseTo(sharesSold * 420);
    expect(result.deployedCapital).toBeCloseTo(32500.5);
    expect(result.closedPositions).toBe(0);
  });

  it("increments closedPositions when sale_partial exhausts remaining shares", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "TINY",
        transactionDate: "2024-01-10",
        transactionType: "purchase",
        amountMin: 1001,
        amountMax: 15000,
      }),
      makeTrade({
        ticker: "TINY",
        transactionDate: "2024-06-15",
        transactionType: "sale_partial",
        amountMin: 15001,
        amountMax: 50000,
      }),
    ];
    const priceMap: PriceMap = {
      TINY: { "2024-01-10": 100, "2024-06-15": 100 },
    };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(0);
    expect(result.closedPositions).toBe(1);
  });

  it("accumulates shares from multiple purchases of the same ticker", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-01-15",
        transactionType: "purchase",
        amountMin: 1001,
        amountMax: 15000,
      }),
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-03-01",
        transactionType: "purchase",
        amountMin: 15001,
        amountMax: 50000,
      }),
    ];
    const priceMap: PriceMap = {
      AAPL: { "2024-01-15": 150, "2024-03-01": 170 },
    };

    const result = buildPortfolio(trades, priceMap);

    const shares1 = 8000.5 / 150;
    const shares2 = 32500.5 / 170;

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0]!.shares).toBeCloseTo(shares1 + shares2);
    expect(result.deployedCapital).toBeCloseTo(8000.5 + 32500.5);
  });

  it("increments unresolvableTickers when price data is missing", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({ ticker: "XYZ", transactionDate: "2024-01-15" }),
    ];
    const priceMap: PriceMap = {};

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(0);
    expect(result.deployedCapital).toBe(0);
    expect(result.unresolvableTickers).toBe(1);
  });

  it("skips exchange transactions", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "AAPL",
        transactionType: "exchange",
      }),
    ];
    const priceMap: PriceMap = { AAPL: { "2024-01-15": 150 } };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(0);
    expect(result.deployedCapital).toBe(0);
    expect(result.unresolvableTickers).toBe(0);
  });

  it("treats bare sale as full close like sale_full", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "GOOG",
        transactionDate: "2024-01-15",
        transactionType: "purchase",
        amountMin: 1001,
        amountMax: 15000,
      }),
      makeTrade({
        ticker: "GOOG",
        transactionDate: "2024-06-15",
        transactionType: "sale",
        amountMin: 1001,
        amountMax: 15000,
      }),
    ];
    const priceMap: PriceMap = {
      GOOG: { "2024-01-15": 140, "2024-06-15": 175 },
    };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(0);
    expect(result.closedPositions).toBe(1);
    expect(result.realizedProceeds).toBeGreaterThan(0);
  });

  it("resolves closest prior price when exact date is missing", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-01-14",
        transactionType: "purchase",
        amountMin: 1001,
        amountMax: 15000,
      }),
    ];
    const priceMap: PriceMap = {
      AAPL: { "2024-01-12": 148 },
    };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(1);
    expect(result.positions[0]!.shares).toBeCloseTo(8000.5 / 148);
    expect(result.unresolvableTickers).toBe(0);
  });

  it("marks trade unresolvable when no price within 7-day lookback", () => {
    const trades: NormalizedTrade[] = [
      makeTrade({
        ticker: "AAPL",
        transactionDate: "2024-01-15",
        transactionType: "purchase",
      }),
    ];
    const priceMap: PriceMap = {
      AAPL: { "2024-01-01": 140 },
    };

    const result = buildPortfolio(trades, priceMap);

    expect(result.positions).toHaveLength(0);
    expect(result.unresolvableTickers).toBe(1);
  });
});

describe("computeReturn", () => {
  it("computes positive return for appreciated open position", () => {
    const portfolio: PortfolioBuildResult = {
      positions: [
        { ticker: "AAPL", shares: 8000.5 / 150, costBasis: 8000.5, openDate: "2024-01-15" },
      ],
      realizedProceeds: 0,
      deployedCapital: 8000.5,
      closedPositions: 0,
      unresolvableTickers: 0,
    };
    const currentPrices = { AAPL: 200 };

    const result = computeReturn(portfolio, currentPrices);

    const expectedCurrentValue = (8000.5 / 150) * 200;
    const expectedReturn = ((expectedCurrentValue - 8000.5) / 8000.5) * 100;

    expect(result.totalReturnPct).toBeCloseTo(expectedReturn);
    expect(result.currentValue).toBeCloseTo(expectedCurrentValue);
    expect(result.openPositions).toBe(1);
    expect(result.closedPositions).toBe(0);
  });

  it("computes return from realized proceeds when position is fully closed", () => {
    const sharesBought = 8000.5 / 150;
    const portfolio: PortfolioBuildResult = {
      positions: [],
      realizedProceeds: sharesBought * 200,
      deployedCapital: 8000.5,
      closedPositions: 1,
      unresolvableTickers: 0,
    };
    const currentPrices = {};

    const result = computeReturn(portfolio, currentPrices);

    const expectedReturn = ((sharesBought * 200 - 8000.5) / 8000.5) * 100;

    expect(result.totalReturnPct).toBeCloseTo(expectedReturn);
    expect(result.openPositions).toBe(0);
    expect(result.closedPositions).toBe(1);
    expect(result.realizedProceeds).toBeCloseTo(sharesBought * 200);
  });

  it("adds missing-current-price positions to unresolvable count", () => {
    const portfolio: PortfolioBuildResult = {
      positions: [
        { ticker: "DELIST", shares: 10, costBasis: 1000, openDate: "2024-01-01" },
      ],
      realizedProceeds: 0,
      deployedCapital: 1000,
      closedPositions: 0,
      unresolvableTickers: 1,
    };
    const currentPrices = {};

    const result = computeReturn(portfolio, currentPrices);

    expect(result.unresolvableTickers).toBe(2);
    expect(result.currentValue).toBe(0);
    expect(result.totalReturnPct).toBeCloseTo(-100);
  });

  it("returns 0 when deployedCapital is zero", () => {
    const portfolio: PortfolioBuildResult = {
      positions: [],
      realizedProceeds: 0,
      deployedCapital: 0,
      closedPositions: 0,
      unresolvableTickers: 0,
    };

    const result = computeReturn(portfolio, {});

    expect(result.totalReturnPct).toBe(0);
    expect(result.deployedCapital).toBe(0);
  });
});

describe("getWindowStartDate", () => {
  const ref = new Date("2026-04-03T12:00:00Z");

  it("returns Jan 1 of current year for ytd", () => {
    const start = getWindowStartDate("ytd", ref);
    expect(start.getUTCFullYear()).toBe(2026);
    expect(start.getUTCMonth()).toBe(0);
    expect(start.getUTCDate()).toBe(1);
  });

  it("returns 12 months ago for l12m", () => {
    const start = getWindowStartDate("l12m", ref);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(3);
  });

  it("returns 5 years ago for l5y", () => {
    const start = getWindowStartDate("l5y", ref);
    expect(start.getFullYear()).toBe(2021);
    expect(start.getMonth()).toBe(3);
  });
});
