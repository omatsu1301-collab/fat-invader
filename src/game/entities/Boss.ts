import Phaser from 'phaser';
import { bosses, type BossId } from '../content/bosses';
import { createBossState, type BossState } from '../domain/boss';
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
 * overlap the player or player projectiles, while keeping it visible for
 * the Stage Clear beat. The sprite itself is torn down with the rest of
 * the scene on the next GameScene shutdown.
 */
export function disableBossHitbox(handle: BossHandle): void {
  const body = handle.sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
}
