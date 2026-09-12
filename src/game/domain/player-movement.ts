import { clamp } from './calorie';

export type PlayerMovementState = {
  x: number;
  y: number;
  velocityXPxPerSec: number;
  velocityYPxPerSec: number;
};

export type PlayerMovementIntent = {
  dragTargetX: number | null;
  dragTargetY: number | null;
  /** Desktop keyboard horizontal axis: -1 left, 0 none, 1 right. */
  moveAxisX: -1 | 0 | 1;
  /** Desktop keyboard vertical axis: -1 up, 0 none, 1 down. */
  moveAxisY: -1 | 0 | 1;
};

export type PlayerMovementTuning = {
  maxSpeed: number;
  accelToMaxMs: number;
  releaseDecelMs: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

/**
 * Normalize a target velocity so keyboard diagonals do not exceed maxSpeed.
 * Pure helper for unit tests (Game Feel Closure / 4-way movement).
 */
export function normalizeDiagonalVelocity(
  vx: number,
  vy: number,
  maxSpeed: number,
): { vx: number; vy: number } {
  const length = Math.hypot(vx, vy);
  if (length <= maxSpeed || length === 0) {
    return { vx, vy };
  }
  const scale = maxSpeed / length;
  return { vx: vx * scale, vy: vy * scale };
}

function rampVelocity(current: number, target: number, maxStep: number): number {
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return target;
  return current + Math.sign(delta) * maxStep;
}

/**
 * FI-02 section 4.3 control quality extended to Combat Zone 2D movement:
 * acceleration/deceleration ramps, diagonal speed normalization, and clamp to
 * [minX,maxX] × [minY,maxY]. Phaser-free for unit tests.
 */
export function computePlayerMovementStep(
  state: PlayerMovementState,
  intent: PlayerMovementIntent,
  dtMs: number,
  tuning: PlayerMovementTuning,
): PlayerMovementState {
  const { maxSpeed, accelToMaxMs, releaseDecelMs, minX, maxX, minY, maxY } = tuning;

  let targetVx = 0;
  let targetVy = 0;

  if (intent.dragTargetX !== null && intent.dragTargetY !== null) {
    const dx = intent.dragTargetX - state.x;
    const dy = intent.dragTargetY - state.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 1) {
      targetVx = (dx / distance) * maxSpeed;
      targetVy = (dy / distance) * maxSpeed;
    }
  } else if (intent.dragTargetX !== null) {
    // Backward-compatible X-only drag (should not occur with 2D InputSystem).
    const distance = intent.dragTargetX - state.x;
    if (Math.abs(distance) > 1) {
      targetVx = Math.sign(distance) * maxSpeed;
    }
  } else {
    targetVx = intent.moveAxisX * maxSpeed;
    targetVy = intent.moveAxisY * maxSpeed;
    const normalized = normalizeDiagonalVelocity(targetVx, targetVy, maxSpeed);
    targetVx = normalized.vx;
    targetVy = normalized.vy;
  }

  const targetSpeed = Math.hypot(targetVx, targetVy);
  const rampMs = targetSpeed === 0 ? releaseDecelMs : accelToMaxMs;
  const rampPerMs = maxSpeed / Math.max(rampMs, 1);
  const maxStep = rampPerMs * dtMs;

  let velocityXPxPerSec = rampVelocity(state.velocityXPxPerSec, targetVx, maxStep);
  let velocityYPxPerSec = rampVelocity(state.velocityYPxPerSec, targetVy, maxStep);

  // Soft-cap length in case of independent axis ramp overshoot on diagonals.
  const capped = normalizeDiagonalVelocity(velocityXPxPerSec, velocityYPxPerSec, maxSpeed);
  velocityXPxPerSec = capped.vx;
  velocityYPxPerSec = capped.vy;

  let nextX = clamp(state.x + (velocityXPxPerSec * dtMs) / 1000, minX, maxX);
  let nextY = clamp(state.y + (velocityYPxPerSec * dtMs) / 1000, minY, maxY);
  if (nextX === minX || nextX === maxX) {
    velocityXPxPerSec = 0;
  }
  if (nextY === minY || nextY === maxY) {
    velocityYPxPerSec = 0;
  }

  return {
    x: nextX,
    y: nextY,
    velocityXPxPerSec,
    velocityYPxPerSec,
  };
}

/** FI-02 section 4.1: simultaneous opposite inputs must yield zero axis (AC-105). */
export function computeMoveAxis(negativeDown: boolean, positiveDown: boolean): -1 | 0 | 1 {
  if (negativeDown === positiveDown) return 0;
  return negativeDown ? -1 : 1;
}
