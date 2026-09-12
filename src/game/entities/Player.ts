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
  velocityYPxPerSec: number;
  invulnerableUntilMs: number;
  nextFireAtMs: number;
};

const TIER_TINT: Record<Exclude<AppearanceTier, 'light'>, number> = {
  rounded: 0x8ff2ff,
  heavy: 0xbfe9ff,
  overflowing: 0xffd7dc,
};

/**
 * Salaryman graybox is not a multicolor North Star sprite. `light` still
 * clears tint; higher tiers keep soft signaling until dedicated tier art exists.
 * Returns `null` when the sprite should clearTint().
 */
export function appearanceTintForTier(tier: AppearanceTier): number | null {
  if (tier === 'light') return null;
  return TIER_TINT[tier];
}

/**
 * Display-only scale by Appearance tier. Must never change Arcade body size.
 * Range kept tiny (1.0–1.05) so readability stays intact.
 */
export function displayScaleForTier(tier: AppearanceTier): number {
  switch (tier) {
    case 'light':
      return 1.0;
    case 'rounded':
      return 1.02;
    case 'heavy':
      return 1.035;
    case 'overflowing':
      return 1.05;
  }
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
  minY: number,
  maxY: number,
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
  sprite.setData('minY', minY);
  sprite.setData('maxY', maxY);
  sprite.clearTint();

  return {
    sprite,
    velocityXPxPerSec: 0,
    velocityYPxPerSec: 0,
    invulnerableUntilMs: 0,
    nextFireAtMs: 0,
  };
}

/**
 * FI-02 section 4.3 control quality: acceleration/deceleration ramps toward
 * the target velocity rather than snapping, for keyboard 4-way and mobile 2D drag.
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
  const minY = sprite.getData('minY') as number;
  const maxY = sprite.getData('maxY') as number;

  const next = computePlayerMovementStep(
    {
      x: sprite.x,
      y: sprite.y,
      velocityXPxPerSec: handle.velocityXPxPerSec,
      velocityYPxPerSec: handle.velocityYPxPerSec,
    },
    intent,
    dtMs,
    {
      maxSpeed: GameBalance.player.baseSpeedPxPerSec * speedMultiplier,
      accelToMaxMs: GameBalance.player.accelToMaxMs,
      releaseDecelMs: GameBalance.player.releaseDecelMs,
      minX,
      maxX,
      minY,
      maxY,
    },
  );
  sprite.x = next.x;
  sprite.y = next.y;
  handle.velocityXPxPerSec = next.velocityXPxPerSec;
  handle.velocityYPxPerSec = next.velocityYPxPerSec;
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
