export function assertNonNegative(n: number): number {
  if (!Number.isFinite(n)) {
    throw new Error("Value must be a finite number.");
  }
  if (n < 0) {
    throw new Error("Value must be non-negative.");
  }
  return n;
}
