export function getMidpoint(min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return 0;
  }

  if (min < 0 || max < 0 || min > max) {
    return 0;
  }

  if (min === 0 && max === 0) {
    return 0;
  }

  if (min === max) {
    return min;
  }

  return (min + max) / 2;
}
