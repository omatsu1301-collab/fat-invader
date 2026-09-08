import { describe, expect, it } from 'vitest';
import {
  computeMoveAxis,
  computePlayerMovementStep,
} from '../../../src/game/domain/player-movement';

const TUNING = {
  maxSpeed: 330,
  accelToMaxMs: 90,
  releaseDecelMs: 70,
  minX: 24,
  maxX: 366,
};

describe('computeMoveAxis', () => {
  it('yields zero when both directions are held (AC-105)', () => {
    expect(computeMoveAxis(true, true)).toBe(0);
  });

  it('yields zero when neither direction is held', () => {
    expect(computeMoveAxis(false, false)).toBe(0);
  });

  it('yields -1 for left-only and 1 for right-only', () => {
    expect(computeMoveAxis(true, false)).toBe(-1);
    expect(computeMoveAxis(false, true)).toBe(1);
  });
});

describe('computePlayerMovementStep', () => {
  it('never leaves [minX, maxX] even with a large single step (AC-104)', () => {
    const state = { x: 350, velocityXPxPerSec: TUNING.maxSpeed };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, moveAxis: 1 },
      1000, // a full second in one step, far more than needed to reach the bound
      TUNING,
    );
    expect(next.x).toBeLessThanOrEqual(TUNING.maxX);
    expect(next.x).toBe(TUNING.maxX);
  });

  it('clamps at the left bound symmetrically', () => {
    const state = { x: 40, velocityXPxPerSec: -TUNING.maxSpeed };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, moveAxis: -1 },
      1000,
      TUNING,
    );
    expect(next.x).toBe(TUNING.minX);
  });

  it('zeroes velocity once a bound is reached', () => {
    const state = { x: TUNING.maxX, velocityXPxPerSec: TUNING.maxSpeed };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, moveAxis: 1 },
      16,
      TUNING,
    );
    expect(next.x).toBe(TUNING.maxX);
    expect(next.velocityXPxPerSec).toBe(0);
  });

  it('ramps toward the target velocity rather than snapping', () => {
    const state = { x: 195, velocityXPxPerSec: 0 };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, moveAxis: 1 },
      16, // one frame at ~60fps
      TUNING,
    );
    expect(next.velocityXPxPerSec).toBeGreaterThan(0);
    expect(next.velocityXPxPerSec).toBeLessThan(TUNING.maxSpeed);
  });

  it('follows a drag target rather than the keyboard axis when dragging', () => {
    const state = { x: 100, velocityXPxPerSec: 0 };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: 300, moveAxis: -1 },
      16,
      TUNING,
    );
    // Drag target is to the right; velocity should move right despite moveAxis=-1.
    expect(next.velocityXPxPerSec).toBeGreaterThan(0);
  });
});
