import Phaser from 'phaser';
import { bosses, type BossId } from '../content/bosses';
import { createBossState, type BossState } from '../domain/boss';
import { GameBalance } from '../config/balance';
import { DisplayDepth } from '../config/display';
import {
  bossDeathBlinkVisible,
  bossDeathHidesSprite,
  bossDeathSquashScale,
} from '../domain/feel';
import { TextureKey } from './textures';

export type BossHandle = {
  sprite: Phaser.Physics.Arcade.Sprite;
  bossId: BossId;
  state: BossState;
  introStartedAtMs: number;
  nextFireAtMs: number;
  directionSign: 1 | -1;
};

const TEXTURE_BY_BOSS: Record<BossId, string> = {
  kingBurgerMini: TextureKey.bossKingBurgerMini,
  pizzaMother: TextureKey.bossPizzaMother,
  kingCalorie: TextureKey.bossKingCalorie,
};

export function spawnBoss(
  scene: Phaser.Scene,
  bossId: BossId,
  x: number,
  y: number,
  nowMs: number,
): BossHandle {
  const def = bosses[bossId];
  const sprite = scene.physics.add.sprite(x, y, TEXTURE_BY_BOSS[bossId]);
  sprite.setDepth(DisplayDepth.actor);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(def.spriteWidth * 0.85, def.spriteHeight * 0.85);
  body.setOffset(def.spriteWidth * 0.075, def.spriteHeight * 0.075);
  body.setImmovable(true);

  return {
    sprite,
    bossId,
    state: createBossState(def.maxHp),
    introStartedAtMs: nowMs,
    nextFireAtMs: 0,
    directionSign: 1,
  };
}

/** Slow horizontal patrol within [minX, maxX], reversing at the bounds. */
export function updateBossMovement(
  handle: BossHandle,
  dtMs: number,
  speedPxPerSec: number,
  minX: number,
  maxX: number,
): void {
  const step = (speedPxPerSec * dtMs * handle.directionSign) / 1000;
  let nextX = handle.sprite.x + step;
  if (nextX <= minX) {
    nextX = minX;
    handle.directionSign = 1;
  } else if (nextX >= maxX) {
    nextX = maxX;
    handle.directionSign = -1;
  }
  handle.sprite.x = nextX;
}

export function playBossHitFlash(handle: BossHandle): void {
  handle.sprite.setTint(0xffffff);
  handle.sprite.scene.time.delayedCall(60, () => {
    if (handle.sprite.active) handle.sprite.clearTint();
  });
}

/**
 * Disables the boss's physics body once defeated so it can no longer
 * overlap the player or player projectiles. The sprite stays visible through
 * impact/internal beats and hides at the finale explosion.
 */
export function disableBossHitbox(handle: BossHandle): void {
  const body = handle.sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
}

/**
 * Display-only death squash / blink / hide, driven by FeedbackSystem display
 * elapsed time (not Scene timers). Hitbox stays disabled; combat is unchanged.
 */
export function updateBossDeathPresentation(handle: BossHandle, elapsedMs: number): void {
  if (bossDeathHidesSprite(elapsedMs)) {
    handle.sprite.setVisible(false);
    handle.sprite.setAlpha(1);
    handle.sprite.setScale(1, 1);
    handle.sprite.clearTint();
    return;
  }

  const squash = bossDeathSquashScale(elapsedMs);
  handle.sprite.setScale(squash.x, squash.y);
  handle.sprite.setVisible(bossDeathBlinkVisible(elapsedMs));
  if (elapsedMs < GameBalance.feel.bossDeath.internalFirstMs) {
    handle.sprite.setTint(0xffffff);
  } else {
    handle.sprite.clearTint();
  }
}
