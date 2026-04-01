import { describe, it, expect } from "vitest";
import { parseAmountRange } from "../amount-parser";

describe("parseAmountRange", () => {
  it("parses $1,001 - $15,000", () => {
    expect(parseAmountRange("$1,001 - $15,000")).toEqual({
      min: 1001,
      max: 15000,
    });
  });

  it("parses $15,001 - $50,000", () => {
    expect(parseAmountRange("$15,001 - $50,000")).toEqual({
      min: 15001,
      max: 50000,
    });
  });

  it("parses $1,000,001 - $5,000,000", () => {
    expect(parseAmountRange("$1,000,001 - $5,000,000")).toEqual({
      min: 1000001,
      max: 5000000,
    });
  });

  it("parses Over $50,000,000", () => {
    expect(parseAmountRange("Over $50,000,000")).toEqual({
      min: 50000000,
      max: 50000000,
    });
  });

  it("parses $50,000,001 -", () => {
    expect(parseAmountRange("$50,000,001 -")).toEqual({
      min: 50000001,
      max: 50000001,
    });
  });

  it("parses $100,001 - $250,000", () => {
    expect(parseAmountRange("$100,001 - $250,000")).toEqual({
      min: 100001,
      max: 250000,
    });
  });

  it("parses $250,001 - $500,000", () => {
    expect(parseAmountRange("$250,001 - $500,000")).toEqual({
      min: 250001,
      max: 500000,
    });
  });

  it("parses $500,001 - $1,000,000", () => {
    expect(parseAmountRange("$500,001 - $1,000,000")).toEqual({
      min: 500001,
      max: 1000000,
    });
  });

  it("parses $50,001 - $100,000", () => {
    expect(parseAmountRange("$50,001 - $100,000")).toEqual({
      min: 50001,
      max: 100000,
    });
  });

  it("returns 0,0 for empty string", () => {
    expect(parseAmountRange("")).toEqual({ min: 0, max: 0 });
  });

  it("returns 0,0 for unparseable value", () => {
    expect(parseAmountRange("Unknown")).toEqual({ min: 0, max: 0 });
  });

  it("handles whitespace variations", () => {
    expect(parseAmountRange("  $1,001  -  $15,000  ")).toEqual({
      min: 1001,
      max: 15000,
    });
  });
});
