/**
 * FI-05 section 6.4: `Math.random()` is banned from gameplay logic. All
 * variability (formation jitter, drop rolls) must go through an injected
 * RandomSource so runs are seedable and E2E-reproducible.
 */
export interface RandomSource {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max]. */
  nextInt(min: number, max: number): number;
}
