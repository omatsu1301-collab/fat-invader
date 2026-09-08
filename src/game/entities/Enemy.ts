import Phaser from 'phaser';
import type { RandomSource } from '../ports/Random';
import { enemies, type EnemyId } from '../content/enemies';
import { DisplayDepth } from '../config/display';
import { rollEnemyFireDelayMs, rollFormationPhaseOffset } from '../domain/combat-rng';
import { TextureKey } from './textures';

export type EnemyRuntimeData = {
  enemyId: EnemyId;
  hp: number;
  baseX: number;
  baseY: number;
  spawnedAtMs: number;
  nextFireAtMs: number;
  lastFireDelayMs: number;
  formationPhaseOffset: number;
};

const TEXTURE_BY_ENEMY: Record<EnemyId, string> = {
  fryScout: TextureKey.enemyFryScout,
};

export function spawnEnemy(
  group: Phaser.Physics.Arcade.Group,
  enemyId: EnemyId,
  x: number,
  y: number,
  nowMs: number,
  random: RandomSource,
): Phaser.Physics.Arcade.Sprite | null {
  const def = enemies[enemyId];
  const sprite = group.get(x, y, TEXTURE_BY_ENEMY[enemyId]) as Phaser.Physics.Arcade.Sprite | null;
  if (!sprite) return null;

  sprite.setActive(true);
  sprite.setVisible(true);
  sprite.setPosition(x, y);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.enable = true;
  body.reset(x, y);
  const hitboxRatio = 0.85;
  body.setSize(def.spriteSize * hitboxRatio, def.spriteSize * hitboxRatio);
  body.setOffset(
    (def.spriteSize - def.spriteSize * hitboxRatio) / 2,
    (def.spriteSize - def.spriteSize * hitboxRatio) / 2,
  );

  const fireDelayMs = rollEnemyFireDelayMs(random, def.fireRateMs, def.fireIntervalJitterMs);
  const runtime: EnemyRuntimeData = {
    enemyId,
    hp: def.maxHp,
    baseX: x,
    baseY: y,
    spawnedAtMs: nowMs,
    nextFireAtMs: nowMs + fireDelayMs,
    lastFireDelayMs: fireDelayMs,
    formationPhaseOffset: rollFormationPhaseOffset(random),
  };
  sprite.setData('enemy', runtime);
  sprite.setDepth(DisplayDepth.actor);
  return sprite;
}

/** FI-02 section 7.2 formationSweep: a gentle side-to-side drift plus slow descent. */
export function updateFormationMovement(
  sprite: Phaser.Physics.Arcade.Sprite,
  nowMs: number,
  stepPxPerSec: number,
  amplitude: number,
): void {
  const runtime = sprite.getData('enemy') as EnemyRuntimeData;
  const elapsedSinceSpawn = nowMs - runtime.spawnedAtMs;
  const sway = Math.sin(elapsedSinceSpawn / 900 + runtime.formationPhaseOffset) * amplitude;
  sprite.x = runtime.baseX + sway;
  sprite.y = runtime.baseY + (elapsedSinceSpawn * stepPxPerSec) / 1000;
}

export function deactivateEnemy(sprite: Phaser.Physics.Arcade.Sprite): void {
  sprite.setActive(false);
  sprite.setVisible(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
}
