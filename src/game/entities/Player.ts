import Phaser from 'phaser';
import type { InputIntent } from '../systems/InputSystem';
import { GameBalance } from '../config/balance';
import { TextureKey } from './textures';
import type { AppearanceTier } from '../domain/calorie';

export type PlayerHandle = {
  sprite: Phaser.Physics.Arcade.Sprite;
  velocityXPxPerSec: number;
  invulnerableUntilMs: number;
  nextFireAtMs: number;
};

const TIER_TINT: Record<AppearanceTier, number> = {
  light: 0x53f6ff,
  rounded: 0x8ff2ff,
  heavy: 0xbfe9ff,
  overflowing: 0xffd7dc,
};

export function createPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  minX: number,
  maxX: number,
): PlayerHandle {
  const sprite = scene.physics.add.sprite(x, y, TextureKey.player);
  sprite.setCollideWorldBounds(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const width = GameBalance.player.spriteSize;
  const hitboxW = width * GameBalance.player.hitboxWidthRatio;
  const hitboxH = width * GameBalance.player.hitboxHeightRatio;
  body.setSize(hitboxW, hitboxH);
  body.setOffset((width - hitboxW) / 2, (width - hitboxH) / 2);
  sprite.setData('minX', minX);
  sprite.setData('maxX', maxX);

  return { sprite, velocityXPxPerSec: 0, invulnerableUntilMs: 0, nextFireAtMs: 0 };
}

/**
 * FI-02 section 4.3 control quality: acceleration/deceleration ramps toward
 * the target velocity rather than snapping, for both keyboard axis input and
 * mobile drag-follow.
 */
export function updatePlayerMovement(
  handle: PlayerHandle,
  intent: InputIntent,
  dtMs: number,
  speedMultiplier: number,
): void {
  const { sprite } = handle;
  const maxSpeed = GameBalance.player.baseSpeedPxPerSec * speedMultiplier;
  const minX = sprite.getData('minX') as number;
  const maxX = sprite.getData('maxX') as number;

  let targetVelocity = 0;
  if (intent.dragTargetX !== null) {
    const distance = intent.dragTargetX - sprite.x;
    if (Math.abs(distance) > 1) {
      targetVelocity = Math.sign(distance) * maxSpeed;
    }
  } else {
    targetVelocity = intent.moveAxis * maxSpeed;
  }

  const rampMs =
    targetVelocity === 0
      ? GameBalance.player.releaseDecelMs
      : GameBalance.player.accelToMaxMs;
  const rampPerMs = maxSpeed / Math.max(rampMs, 1);
  const maxStep = rampPerMs * dtMs;

  const delta = targetVelocity - handle.velocityXPxPerSec;
  if (Math.abs(delta) <= maxStep) {
    handle.velocityXPxPerSec = targetVelocity;
  } else {
    handle.velocityXPxPerSec += Math.sign(delta) * maxStep;
  }

  const nextX = sprite.x + (handle.velocityXPxPerSec * dtMs) / 1000;
  sprite.x = Phaser.Math.Clamp(nextX, minX, maxX);
  if (sprite.x === minX || sprite.x === maxX) {
    handle.velocityXPxPerSec = 0;
  }
}

export function setAppearanceTint(handle: PlayerHandle, tier: AppearanceTier): void {
  handle.sprite.setTint(TIER_TINT[tier]);
}

export function isInvulnerable(handle: PlayerHandle, nowMs: number): boolean {
  return nowMs < handle.invulnerableUntilMs;
}

export function applyHitFlash(handle: PlayerHandle, nowMs: number): void {
  handle.invulnerableUntilMs = nowMs + GameBalance.player.hitInvulnerabilityMs;
  handle.sprite.setAlpha(0.5);
  handle.sprite.scene.time.delayedCall(120, () => {
    if (handle.sprite.active) handle.sprite.setAlpha(1);
  });
}
