import { clamp } from './calorie';

export type PlayerMovementState = {
  x: number;
  velocityXPxPerSec: number;
};

export type PlayerMovementIntent = {
  dragTargetX: number | null;
  moveAxis: -1 | 0 | 1;
};

export type PlayerMovementTuning = {
  maxSpeed: number;
  accelToMaxMs: number;
  releaseDecelMs: number;
  minX: number;
  maxX: number;
};

/**
 * FI-02 section 4.3 control quality: acceleration/deceleration ramps toward
 * a target velocity rather than snapping, for both keyboard axis input and
 * mobile drag-follow, and the player never leaves [minX, maxX] (AC-104).
 * Pure and Phaser-free (tuning passed in rather than read from GameBalance
 * directly, matching the domain layer's existing parameter-passing style)
 * so it is directly unit-testable.
 */
export function computePlayerMovementStep(
  state: PlayerMovementState,
  intent: PlayerMovementIntent,
  dtMs: number,
  tuning: PlayerMovementTuning,
): PlayerMovementState {
  const { maxSpeed, accelToMaxMs, releaseDecelMs, minX, maxX } = tuning;

  let targetVelocity = 0;
  if (intent.dragTargetX !== null) {
    const distance = intent.dragTargetX - state.x;
    if (Math.abs(distance) > 1) {
      targetVelocity = Math.sign(distance) * maxSpeed;
    }
  } else {
    targetVelocity = intent.moveAxis * maxSpeed;
  }

  const rampMs = targetVelocity === 0 ? releaseDecelMs : accelToMaxMs;
  const rampPerMs = maxSpeed / Math.max(rampMs, 1);
  const maxStep = rampPerMs * dtMs;

  const delta = targetVelocity - state.velocityXPxPerSec;
  let velocityXPxPerSec = state.velocityXPxPerSec;
  if (Math.abs(delta) <= maxStep) {
    velocityXPxPerSec = targetVelocity;
  } else {
    velocityXPxPerSec += Math.sign(delta) * maxStep;
  }

  const nextX = clamp(state.x + (velocityXPxPerSec * dtMs) / 1000, minX, maxX);
  if (nextX === minX || nextX === maxX) {
    velocityXPxPerSec = 0;
  }

  return { x: nextX, velocityXPxPerSec };
}

/** FI-02 section 4.1: simultaneous left+right input must yield zero axis (AC-105). */
export function computeMoveAxis(leftDown: boolean, rightDown: boolean): -1 | 0 | 1 {
  if (leftDown === rightDown) return 0;
  return leftDown ? -1 : 1;
}
