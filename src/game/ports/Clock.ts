/**
 * FI-03 section 3.1: gameplay logic runs on gameTimeMs, not wall-clock time.
 * It must not advance while paused or while the tab is hidden, and each
 * frame's delta is clamped so a stalled tab cannot cause a huge catch-up step.
 */
export interface GameClock {
  nowMs(): number;
  lastDeltaMs(): number;
}
