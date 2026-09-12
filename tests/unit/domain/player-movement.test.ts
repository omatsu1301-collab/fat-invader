import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import {
  computeMoveAxis,
  computePlayerMovementStep,
  normalizeDiagonalVelocity,
} from '../../../src/game/domain/player-movement';

const LOGICAL_HEIGHT = 844;
const TUNING = {
  maxSpeed: 330,
  accelToMaxMs: 90,
  releaseDecelMs: 70,
  minX: 24,
  maxX: 366,
  minY: LOGICAL_HEIGHT * GameBalance.player.combatZoneMinYFraction,
  maxY: LOGICAL_HEIGHT * GameBalance.player.combatZoneMaxYFraction,
};

describe('computeMoveAxis', () => {
  it('yields zero when both directions are held (AC-105)', () => {
    expect(computeMoveAxis(true, true)).toBe(0);
  });

  it('yields zero when neither direction is held', () => {
    expect(computeMoveAxis(false, false)).toBe(0);
  });

  it('yields -1 for negative-only and 1 for positive-only', () => {
    expect(computeMoveAxis(true, false)).toBe(-1);
    expect(computeMoveAxis(false, true)).toBe(1);
  });
});

describe('normalizeDiagonalVelocity', () => {
  it('keeps axis-aligned speed unchanged', () => {
    expect(normalizeDiagonalVelocity(330, 0, 330)).toEqual({ vx: 330, vy: 0 });
    expect(normalizeDiagonalVelocity(0, -330, 330)).toEqual({ vx: 0, vy: -330 });
  });

  it('normalizes diagonal so speed equals maxSpeed', () => {
    const { vx, vy } = normalizeDiagonalVelocity(330, 330, 330);
    expect(Math.hypot(vx, vy)).toBeCloseTo(330, 5);
    expect(Math.abs(vx)).toBeCloseTo(330 / Math.SQRT2, 5);
    expect(Math.abs(vy)).toBeCloseTo(330 / Math.SQRT2, 5);
  });
});

describe('computePlayerMovementStep', () => {
  it('never leaves horizontal [minX, maxX] even with a large single step (AC-104)', () => {
    const state = {
      x: 350,
      y: TUNING.minY + 40,
      velocityXPxPerSec: TUNING.maxSpeed,
      velocityYPxPerSec: 0,
    };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, dragTargetY: null, moveAxisX: 1, moveAxisY: 0 },
      1000,
      TUNING,
    );
    expect(next.x).toBe(TUNING.maxX);
  });

  it('clamps at the left bound symmetrically', () => {
    const state = {
      x: 40,
      y: TUNING.minY + 40,
      velocityXPxPerSec: -TUNING.maxSpeed,
      velocityYPxPerSec: 0,
    };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, dragTargetY: null, moveAxisX: -1, moveAxisY: 0 },
      1000,
      TUNING,
    );
    expect(next.x).toBe(TUNING.minX);
  });

  it('clamps vertical movement to Combat Zone bounds', () => {
    const up = computePlayerMovementStep(
      {
        x: 195,
        y: TUNING.minY + 10,
        velocityXPxPerSec: 0,
        velocityYPxPerSec: -TUNING.maxSpeed,
      },
      { dragTargetX: null, dragTargetY: null, moveAxisX: 0, moveAxisY: -1 },
      1000,
      TUNING,
    );
    expect(up.y).toBe(TUNING.minY);

    const down = computePlayerMovementStep(
      {
        x: 195,
        y: TUNING.maxY - 10,
        velocityXPxPerSec: 0,
        velocityYPxPerSec: TUNING.maxSpeed,
      },
      { dragTargetX: null, dragTargetY: null, moveAxisX: 0, moveAxisY: 1 },
      1000,
      TUNING,
    );
    expect(down.y).toBe(TUNING.maxY);
  });

  it('zeroes velocity once a bound is reached', () => {
    const state = {
      x: TUNING.maxX,
      y: TUNING.maxY,
      velocityXPxPerSec: TUNING.maxSpeed,
      velocityYPxPerSec: TUNING.maxSpeed,
    };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, dragTargetY: null, moveAxisX: 1, moveAxisY: 1 },
      16,
      TUNING,
    );
    expect(next.x).toBe(TUNING.maxX);
    expect(next.y).toBe(TUNING.maxY);
    expect(next.velocityXPxPerSec).toBe(0);
    expect(next.velocityYPxPerSec).toBe(0);
  });

  it('ramps toward the target velocity rather than snapping', () => {
    const state = {
      x: 195,
      y: TUNING.minY + 80,
      velocityXPxPerSec: 0,
      velocityYPxPerSec: 0,
    };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, dragTargetY: null, moveAxisX: 1, moveAxisY: 0 },
      16,
      TUNING,
    );
    expect(next.velocityXPxPerSec).toBeGreaterThan(0);
    expect(next.velocityXPxPerSec).toBeLessThan(TUNING.maxSpeed);
  });

  it('keeps diagonal keyboard speed at maxSpeed after ramp settles', () => {
    let state = {
      x: 195,
      y: TUNING.minY + 80,
      velocityXPxPerSec: 0,
      velocityYPxPerSec: 0,
    };
    for (let i = 0; i < 20; i += 1) {
      state = computePlayerMovementStep(
        state,
        { dragTargetX: null, dragTargetY: null, moveAxisX: 1, moveAxisY: -1 },
        16,
        TUNING,
      );
    }
    expect(Math.hypot(state.velocityXPxPerSec, state.velocityYPxPerSec)).toBeCloseTo(
      TUNING.maxSpeed,
      0,
    );
  });

  it('follows a 2D drag target rather than the keyboard axis when dragging', () => {
    const state = {
      x: 100,
      y: TUNING.maxY - 20,
      velocityXPxPerSec: 0,
      velocityYPxPerSec: 0,
    };
    const next = computePlayerMovementStep(
      state,
      {
        dragTargetX: 300,
        dragTargetY: TUNING.minY + 10,
        moveAxisX: -1,
        moveAxisY: 1,
      },
      16,
      TUNING,
    );
    expect(next.velocityXPxPerSec).toBeGreaterThan(0);
    expect(next.velocityYPxPerSec).toBeLessThan(0);
  });

  it('preserves horizontal-only feel when only moveAxisX is set', () => {
    const state = {
      x: 195,
      y: TUNING.minY + 80,
      velocityXPxPerSec: 0,
      velocityYPxPerSec: 0,
    };
    const next = computePlayerMovementStep(
      state,
      { dragTargetX: null, dragTargetY: null, moveAxisX: 1, moveAxisY: 0 },
      16,
      TUNING,
    );
    expect(next.velocityYPxPerSec).toBe(0);
    expect(next.y).toBe(state.y);
    expect(next.velocityXPxPerSec).toBeGreaterThan(0);
  });
});
