/**
 * FI-05 section 6.4: `Math.random()` is banned from gameplay and VFX.
 * Formation jitter, fire delay, and decorative variation go through injected
 * RandomSource instances. Gameplay and VFX must use separate streams so
 * Reduced Effects cannot shift later enemy shots.
 */
export interface RandomSource {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max]. */
  nextInt(min: number, max: number): number;
}
