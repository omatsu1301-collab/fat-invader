export const CALORIE_MIN = 0;
export const CALORIE_MAX = 100;

export type AppearanceTier = 'light' | 'rounded' | 'heavy' | 'overflowing';

/**
 * FI-02 section 5.1/5.2: CALORIE is the sole failure condition and drives a
 * cosmetic appearance tier. Clamped to [0, 100] per FI-03 section 13
 * invariant `0 <= calorie <= 100`.
 */
export function applyCalorie(current: number, amount: number): number {
  return clamp(current + amount, CALORIE_MIN, CALORIE_MAX);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Tier boundaries per FI-02 section 5.2: 0-24 light, 25-49 rounded,
 * 50-74 heavy, 75-99 overflowing. AC-116 requires exact 24/25, 49/50,
 * 74/75 switch points.
 */
export function calorieTier(calorie: number): AppearanceTier {
  if (calorie >= 75) return 'overflowing';
  if (calorie >= 50) return 'heavy';
  if (calorie >= 25) return 'rounded';
  return 'light';
}

export function isFatOver(calorie: number): boolean {
  return calorie >= CALORIE_MAX;
}
