import Phaser from 'phaser';
import type { RandomSource } from '../ports/Random';
import { enemies, type EnemyId } from '../content/enemies';
import type { PatternId } from '../content/patterns';
import { DisplayDepth } from '../config/display';
import { GameBalance } from '../config/balance';
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
  firePattern: PatternId;
  shotIndex: number;
  /** telegraphCharge state */
  chargeState: 'idle' | 'tell' | 'charge';
  chargeUntilMs: number;
  chargeDir: 1 | -1;
};

const TEXTURE_BY_ENEMY: Record<EnemyId, string> = {
  fryScout: TextureKey.enemyFryScout,
  donutDrifter: TextureKey.enemyDonutDrifter,
  sodaTank: TextureKey.enemySodaTank,
  pizzaCutter: TextureKey.enemyPizzaCutter,
  cakeCaster: TextureKey.enemyCakeCaster,
};

export function spawnEnemy(
  group: Phaser.Physics.Arcade.Group,
  enemyId: EnemyId,
  x: number,
  y: number,
  nowMs: number,
  random: RandomSource,
  firePatternOverride?: PatternId,
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
    firePattern: firePatternOverride ?? def.firePattern,
    shotIndex: 0,
    chargeState: 'idle',
    chargeUntilMs: 0,
    chargeDir: x < 195 ? 1 : -1,
  };
  sprite.setData('enemy', runtime);
  sprite.setDepth(DisplayDepth.actor);
  return sprite;
}

export function updateEnemyMovement(
  sprite: Phaser.Physics.Arcade.Sprite,
  nowMs: number,
  formationDescentPxPerSec: number,
): void {
  const runtime = sprite.getData('enemy') as EnemyRuntimeData;
  const def = enemies[runtime.enemyId];
  const elapsed = nowMs - runtime.spawnedAtMs;

  switch (def.movementPattern) {
    case 'sine': {
      const amp = GameBalance.enemy.donutDrifter.sineAmplitudePx;
      const period = GameBalance.enemy.donutDrifter.sinePeriodMs;
      const sway = Math.sin(elapsed / period + runtime.formationPhaseOffset) * amp;
      sprite.x = runtime.baseX + sway;
      sprite.y = runtime.baseY + (elapsed * def.speedPxPerSec) / 1000;
      break;
    }
    case 'slowDrift': {
      sprite.x = runtime.baseX + Math.sin(elapsed / 1600) * 12;
      sprite.y = runtime.baseY + (elapsed * def.speedPxPerSec) / 1000;
      break;
    }
    case 'telegraphCharge': {
      if (runtime.chargeState === 'tell') {
        sprite.x = runtime.baseX;
        sprite.y = runtime.baseY + (elapsed * 20) / 1000;
      } else if (runtime.chargeState === 'charge') {
        sprite.x += runtime.chargeDir * (def.speedPxPerSec * 16) / 1000;
        sprite.y += (def.speedPxPerSec * 12) / 1000;
      } else {
        sprite.x = runtime.baseX + Math.sin(elapsed / 900) * 10;
        sprite.y = runtime.baseY + (elapsed * 35) / 1000;
      }
      break;
    }
    case 'casterHold': {
      sprite.x = runtime.baseX + Math.sin(elapsed / 1200 + runtime.formationPhaseOffset) * 20;
      sprite.y = runtime.baseY + Math.min(40, (elapsed * def.speedPxPerSec) / 1000);
      break;
    }
    case 'formation':
    default: {
      const sway = Math.sin(elapsed / 900 + runtime.formationPhaseOffset) * 18;
      sprite.x = runtime.baseX + sway;
      sprite.y = runtime.baseY + (elapsed * formationDescentPxPerSec) / 1000;
      break;
    }
  }
}

/** @deprecated use updateEnemyMovement */
export function updateFormationMovement(
  sprite: Phaser.Physics.Arcade.Sprite,
  nowMs: number,
  stepPxPerSec: number,
  _amplitude: number,
): void {
  updateEnemyMovement(sprite, nowMs, stepPxPerSec);
}

export function deactivateEnemy(sprite: Phaser.Physics.Arcade.Sprite): void {
  sprite.setActive(false);
  sprite.setVisible(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
}
