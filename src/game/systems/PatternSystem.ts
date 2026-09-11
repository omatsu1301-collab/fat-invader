import Phaser from 'phaser';
import { bullets, type BulletId } from '../content/bullets';
import type { PatternId } from '../content/patterns';
import { TextureKey } from '../entities/textures';
import { fireProjectile, type ProjectilePayload } from '../entities/Projectile';
import { planSodaLaserCorridor, type SodaLaserCorridorPlan } from './sodaLaser';

export type PatternTellKind = 'diagonal' | 'laser' | 'cast';

export type PatternTellOptions = {
  durationMs?: number;
  /** Absolute end Y for long-range laser tell (player band / playfield bottom). */
  endY?: number;
  /** Beam corridor width in px (visual must match hazard). */
  widthPx?: number;
};

export type PatternFireContext = {
  group: Phaser.Physics.Arcade.Group;
  x: number;
  y: number;
  patternId: PatternId;
  /** For alternating / aimed variants. */
  shotIndex?: number;
  playerX?: number;
  /** Optional telegraph callback — caller schedules delayed real fire. */
  scheduleTelegraph?: (delayMs: number, fire: () => void) => void;
  /** Spawn a visible tell line/beam preview. */
  showTell?: (
    kind: PatternTellKind,
    x: number,
    y: number,
    meta?: number,
    options?: PatternTellOptions,
  ) => void;
};

export type PatternFireResult = {
  fired: number;
  /** True if the pattern only scheduled a delayed shot (telegraph). */
  deferred: boolean;
};

function enemyPayload(bulletId: BulletId): ProjectilePayload {
  const def = bullets[bulletId];
  return { kind: 'enemy', damage: 0, calorie: def.calorie, bulletId: def.id };
}

function textureForBullet(bulletId: BulletId): string {
  switch (bulletId) {
    case 'fry':
      return TextureKey.bulletFry;
    case 'donut':
      return TextureKey.bulletDonut;
    case 'pizzaSlice':
      return TextureKey.bulletPizza;
    case 'tapioca':
      return TextureKey.bulletTapioca;
    case 'cake':
      return TextureKey.bulletCake;
    case 'sodaLaser':
      return TextureKey.bulletLaser;
    default:
      return TextureKey.bulletFry;
  }
}

function fireDown(
  ctx: PatternFireContext,
  bulletId: BulletId,
  x: number,
  y: number,
  vx: number,
  vy: number,
): void {
  const sprite = fireProjectile(ctx.group, textureForBullet(bulletId), x, y, vx, vy, enemyPayload(bulletId));
  if (!sprite) return;
  if (bulletId === 'donut') {
    const def = bullets.donut;
    sprite.setData('sine', {
      originX: x,
      amplitude: def.sineAmplitudePx ?? 36,
      periodMs: def.sinePeriodMs ?? 900,
      bornAtMs: sprite.scene.time.now,
      baseVx: vx,
    });
  }
}

/**
 * Stationary vertical hazard from muzzle to player band. Visual size matches
 * Arcade body; segments expire after beamDurationMs (no slow crawl).
 */
function spawnSodaLaserBeam(ctx: PatternFireContext, plan: SodaLaserCorridorPlan): number {
  let fired = 0;
  const expiresAtMs = (ctx.group.scene?.time.now ?? 0) + plan.beamDurationMs;
  for (const y of plan.segmentYs) {
    const sprite = fireProjectile(
      ctx.group,
      textureForBullet('sodaLaser'),
      plan.laneX,
      y,
      0,
      0,
      enemyPayload('sodaLaser'),
    );
    if (!sprite) break;
    // Display stretch; body uses unscaled frame so world AABB == display size.
    sprite.setDisplaySize(plan.widthPx, plan.segmentSpacingPx);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(sprite.frame.width, sprite.frame.height);
    body.setOffset(0, 0);
    sprite.setData('expiresAtMs', expiresAtMs);
    sprite.setData('sodaLaserLaneX', plan.laneX);
    sprite.setData('sodaLaserEndY', plan.endY);
    fired += 1;
  }
  return fired;
}

function spreadFan(
  ctx: PatternFireContext,
  bulletId: BulletId,
  count: number,
  spreadDeg: number,
  speed: number,
): number {
  let fired = 0;
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5;
    const angleDeg = 90 + t * spreadDeg * 2;
    const angleRad = Phaser.Math.DegToRad(angleDeg);
    fireDown(ctx, bulletId, ctx.x, ctx.y, Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    fired += 1;
  }
  return fired;
}

function radial(
  ctx: PatternFireContext,
  bulletId: BulletId,
  count: number,
  speed: number,
): number {
  let fired = 0;
  for (let i = 0; i < count; i += 1) {
    const angleRad = (Math.PI * 2 * i) / count + Math.PI / 2;
    fireDown(ctx, bulletId, ctx.x, ctx.y, Math.cos(angleRad) * speed, Math.sin(angleRad) * speed);
    fired += 1;
  }
  return fired;
}

/**
 * Fires one attack combination. Telegraph patterns schedule delayed fire via
 * `scheduleTelegraph` (minimum tell durations live in GameBalance / bullets).
 */
export function firePattern(ctx: PatternFireContext): PatternFireResult {
  const schedule = ctx.scheduleTelegraph;
  switch (ctx.patternId) {
    case 'fryStraight': {
      const speed = bullets.fry.speedPxPerSec;
      fireDown(ctx, 'fry', ctx.x, ctx.y, 0, speed);
      return { fired: 1, deferred: false };
    }
    case 'fry3Way': {
      return { fired: spreadFan(ctx, 'fry', 3, 24, bullets.fry.speedPxPerSec), deferred: false };
    }
    case 'fryAlternating': {
      const lane = (ctx.shotIndex ?? 0) % 2 === 0 ? -40 : 40;
      const aimedX = (ctx.playerX ?? ctx.x) + lane * 0.15;
      const dx = aimedX - ctx.x;
      const dy = 220;
      const len = Math.hypot(dx, dy) || 1;
      const speed = bullets.fry.speedPxPerSec;
      fireDown(ctx, 'fry', ctx.x, ctx.y, (dx / len) * speed, (dy / len) * speed);
      return { fired: 1, deferred: false };
    }
    case 'donutSine': {
      fireDown(ctx, 'donut', ctx.x, ctx.y, 0, bullets.donut.speedPxPerSec);
      return { fired: 1, deferred: false };
    }
    case 'pizzaSliceTelegraph': {
      const tellMs = bullets.pizzaSlice.telegraphMs ?? 650;
      const dir = (ctx.shotIndex ?? 0) % 2 === 0 ? -1 : 1;
      ctx.showTell?.('diagonal', ctx.x, ctx.y, dir);
      if (!schedule) {
        const speed = bullets.pizzaSlice.speedPxPerSec;
        fireDown(ctx, 'pizzaSlice', ctx.x, ctx.y, dir * speed * 0.55, speed);
        return { fired: 1, deferred: false };
      }
      schedule(tellMs, () => {
        const speed = bullets.pizzaSlice.speedPxPerSec;
        fireDown(ctx, 'pizzaSlice', ctx.x, ctx.y, dir * speed * 0.55, speed);
      });
      return { fired: 0, deferred: true };
    }
    case 'pizzaSliceFan': {
      return {
        fired: spreadFan(ctx, 'pizzaSlice', 3, 28, bullets.pizzaSlice.speedPxPerSec),
        deferred: false,
      };
    }
    case 'tapiocaSpread5': {
      const count = bullets.tapioca.spreadCount ?? 5;
      const spread = bullets.tapioca.spreadDeg ?? 40;
      return {
        fired: spreadFan(ctx, 'tapioca', count, spread / 2, bullets.tapioca.speedPxPerSec),
        deferred: false,
      };
    }
    case 'cakeLargeSlow': {
      const tellMs = 650;
      ctx.showTell?.('cast', ctx.x, ctx.y);
      if (!schedule) {
        fireDown(ctx, 'cake', ctx.x, ctx.y, 0, bullets.cake.speedPxPerSec);
        return { fired: 1, deferred: false };
      }
      schedule(tellMs, () => {
        fireDown(ctx, 'cake', ctx.x, ctx.y, 0, bullets.cake.speedPxPerSec);
      });
      return { fired: 0, deferred: true };
    }
    case 'sodaLaser': {
      // Lane locked at telegraph start — never re-aim at player after tell.
      const plan = planSodaLaserCorridor(ctx.x, ctx.y);
      ctx.showTell?.('laser', plan.laneX, plan.sourceY, undefined, {
        durationMs: plan.telegraphMs,
        endY: plan.endY,
        widthPx: plan.widthPx,
      });
      if (!schedule) {
        return { fired: spawnSodaLaserBeam(ctx, plan), deferred: false };
      }
      schedule(plan.telegraphMs, () => {
        spawnSodaLaserBeam(ctx, plan);
      });
      return { fired: 0, deferred: true };
    }
    case 'pizzaRadial8': {
      return { fired: radial(ctx, 'pizzaSlice', 8, bullets.pizzaSlice.speedPxPerSec * 0.85), deferred: false };
    }
    case 'fryDonutComposite': {
      fireDown(ctx, 'fry', ctx.x - 12, ctx.y, 0, bullets.fry.speedPxPerSec);
      fireDown(ctx, 'donut', ctx.x + 12, ctx.y, 0, bullets.donut.speedPxPerSec);
      return { fired: 2, deferred: false };
    }
    case 'tapiocaLaserComposite': {
      const tapioca = firePattern({ ...ctx, patternId: 'tapiocaSpread5' });
      const laser = firePattern({ ...ctx, patternId: 'sodaLaser' });
      return { fired: tapioca.fired + laser.fired, deferred: laser.deferred };
    }
    case 'kingCalorieFinale': {
      const a = firePattern({ ...ctx, patternId: 'pizzaRadial8' });
      const b = firePattern({ ...ctx, patternId: 'fry3Way' });
      return { fired: a.fired + b.fired, deferred: false };
    }
    default:
      fireDown(ctx, 'fry', ctx.x, ctx.y, 0, bullets.fry.speedPxPerSec);
      return { fired: 1, deferred: false };
  }
}

export { patternTelegraphMs } from '../content/patterns';
