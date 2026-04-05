import { describe, expect, it } from "vitest";

import { getMidpoint } from "../midpoint";

describe("getMidpoint", () => {
  it("returns the midpoint for a standard disclosure range", () => {
    expect(getMidpoint(1001, 15000)).toBe(8000.5);
    expect(getMidpoint(500001, 1000000)).toBe(750000.5);
    expect(getMidpoint(5000001, 25000000)).toBe(15000000.5);
  });

  it("returns the exact value when min and max are equal", () => {
    expect(getMidpoint(50000001, 50000001)).toBe(50000001);
  });

  it("returns 0 for unparseable amounts", () => {
    expect(getMidpoint(0, 0)).toBe(0);
  });

  it("returns 0 for invalid ranges", () => {
    expect(getMidpoint(15000, 1001)).toBe(0);
    expect(getMidpoint(-1, 100)).toBe(0);
    expect(getMidpoint(100, -1)).toBe(0);
  });

  it("preserves half-dollar midpoints without rounding", () => {
    expect(getMidpoint(1000001, 5000000)).toBe(3000000.5);
    expect(getMidpoint(250001, 500000)).toBe(375000.5);
  });
});
