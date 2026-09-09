import type { RandomSource } from '../ports/Random';

/**
 * Gameplay-only fire interval. Must never read a VFX stream — Reduced
 * Effects / Off change decorative draw counts and would otherwise shift
 * later enemy shots (FI-05 §6.4, AC-201).
 */
export function rollEnemyFireDelayMs(
  random: RandomSource,
  fireRateMs: number,
  fireIntervalJitterMs: number,
): number {
  return fireRateMs + random.nextInt(0, fireIntervalJitterMs);
}

/** Formation sway phase. Same stream as fire jitter: gameplayRandom only. */
export function rollFormationPhaseOffset(random: RandomSource): number {
  return random.next() * Math.PI * 2;
}
