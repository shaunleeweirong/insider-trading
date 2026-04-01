function parseDollarAmount(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export function parseAmountRange(raw: string): { min: number; max: number } {
  const trimmed = raw.trim();
  if (!trimmed) return { min: 0, max: 0 };

  const overMatch = trimmed.match(/^over\s+(\$[\d,]+)$/i);
  if (overMatch) {
    const value = parseDollarAmount(overMatch[1]!);
    return { min: value, max: value };
  }

  const rangeMatch = trimmed.match(/^(\$[\d,]+)\s*-\s*(\$[\d,]+)?$/);
  if (rangeMatch) {
    const min = parseDollarAmount(rangeMatch[1]!);
    const max = rangeMatch[2] ? parseDollarAmount(rangeMatch[2]) : min;
    return { min, max };
  }

  return { min: 0, max: 0 };
}
