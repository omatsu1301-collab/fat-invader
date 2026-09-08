import type { RandomSource } from '../ports/Random';

function hashSeed(seed: string): number {
  // FNV-1a style string hash, kept deterministic and dependency-free.
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0 || 1;
}

/**
 * Mulberry32 PRNG. Deterministic given the same seed string, satisfying
 * FI-05 section 6.4 (seedable, no `Math.random()`) and FI-03 section 15
 * ("Seed固定の自動テストで壊れていないことを確認").
 */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: string) {
    this.state = hashSeed(seed);
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Generates a fresh, non-adversarial seed for production runs (FI-05 section
 * 6.4: "起動時のsecure-enough random stringでよい"). Uses crypto rather than
 * `Math.random()` so the ban on that API stays absolute across the codebase.
 */
export function generateRuntimeSeed(): string {
  const bytes = new Uint32Array(2);
  crypto.getRandomValues(bytes);
  return `run-${Date.now().toString(36)}-${bytes[0]!.toString(36)}${bytes[1]!.toString(36)}`;
}
