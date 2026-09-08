import type { GameClock } from '../ports/Clock';

const MAX_DELTA_MS = 50;

/**
 * FI-03 section 3.1 / FI-05 section 6.3: fed by Phaser's per-frame delta via
 * `tick()`, clamps to 50ms, and only advances gameTimeMs while `isRunning` is
 * true (i.e. not paused and the tab is visible). Holds no Phaser reference
 * itself so it stays trivially unit-testable.
 */
export class PhaserClock implements GameClock {
  private accumulatedMs = 0;
  private frameDeltaMs = 0;

  tick(rawDeltaMs: number, isRunning: boolean): void {
    const clamped = Math.min(Math.max(rawDeltaMs, 0), MAX_DELTA_MS);
    this.frameDeltaMs = isRunning ? clamped : 0;
    if (isRunning) {
      this.accumulatedMs += this.frameDeltaMs;
    }
  }

  nowMs(): number {
    return this.accumulatedMs;
  }

  lastDeltaMs(): number {
    return this.frameDeltaMs;
  }
}
