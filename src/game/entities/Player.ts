import Phaser from 'phaser';
import type { InputIntent } from '../systems/InputSystem';
import { GameBalance } from '../config/balance';
import { DisplayDepth } from '../config/display';
import { TextureKey } from './textures';
import type { AppearanceTier } from '../domain/calorie';
import { computePlayerMovementStep } from '../domain/player-movement';

export type PlayerHandle = {
  sprite: Phaser.Physics.Arcade.Sprite;
  velocityXPxPerSec: number;
  invulnerableUntilMs: number;
  nextFireAtMs: number;
};

const TIER_TINT: Record<Exclude<AppearanceTier, 'light'>, number> = {
  rounded: 0x8ff2ff,
  heavy: 0xbfe9ff,
  overflowing: 0xffd7dc,
};

/**
 * Pilot one-still Player art is multicolor. `light` must not cyan-wash authored pixels.
 * Higher tiers keep temporary tint signaling until dedicated tier sprites exist.
 * Returns `null` when the sprite should clearTint().
 */
export function appearanceTintForTier(tier: AppearanceTier): number | null {
  if (tier === 'light') return null;
  return TIER_TINT[tier];
}

export function setAppearanceTint(handle: PlayerHandle, tier: AppearanceTier): void {
  const tint = appearanceTintForTier(tier);
  if (tint === null) {
    handle.sprite.clearTint();
    return;
  }
  handle.sprite.setTint(tint);
}

export function createPlayer(
  scene: Phaser.Scene,
  x: number,
  y: number,
  minX: number,
  maxX: number,
): PlayerHandle {
  const sprite = scene.physics.add.sprite(x, y, TextureKey.player);
  sprite.setDepth(DisplayDepth.actor);
  sprite.setCollideWorldBounds(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const width = GameBalance.player.spriteSize;
  const hitboxW = width * GameBalance.player.hitboxWidthRatio;
  const hitboxH = width * GameBalance.player.hitboxHeightRatio;
  body.setSize(hitboxW, hitboxH);
  body.setOffset((width - hitboxW) / 2, (width - hitboxH) / 2);
  sprite.setData('minX', minX);
  sprite.setData('maxX', maxX);
  sprite.clearTint();

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
  const minX = sprite.getData('minX') as number;
  const maxX = sprite.getData('maxX') as number;

  const next = computePlayerMovementStep(
    { x: sprite.x, velocityXPxPerSec: handle.velocityXPxPerSec },
    intent,
    dtMs,
    {
      maxSpeed: GameBalance.player.baseSpeedPxPerSec * speedMultiplier,
      accelToMaxMs: GameBalance.player.accelToMaxMs,
      releaseDecelMs: GameBalance.player.releaseDecelMs,
      minX,
      maxX,
    },
  );
  sprite.x = next.x;
  handle.velocityXPxPerSec = next.velocityXPxPerSec;
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

/** Display-only FAT OVER squash; hitbox size is unchanged. */
export function applyFatOverPose(handle: PlayerHandle): void {
  handle.sprite.setTint(0xffd7dc);
  handle.sprite.setScale(1.18, 0.82);
}
