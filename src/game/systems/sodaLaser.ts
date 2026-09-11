import { GameBalance } from '../config/balance';
import { bullets } from '../content/bullets';

/**
 * Pure soda-laser corridor plan shared by PatternSystem, tell graphics, and
 * fairness tests. One attack = one continuous hazard from source to player band.
 * Lane X is fixed at telegraph start.
 */
export type SodaLaserCorridorPlan = {
  laneX: number;
  sourceY: number;
  topY: number;
  endY: number;
  centerY: number;
  heightPx: number;
  widthPx: number;
  halfWidthPx: number;
  telegraphMs: number;
  beamDurationMs: number;
  /** Always 1 — laser must never consume N normal projectile slots. */
  hazardSlots: 1;
};

/** Playfield / player-band end Y — beam must reach at least into the player band. */
export function sodaLaserReachY(): number {
  return bullets.sodaLaser.beamReachY ?? GameBalance.bullet.sodaLaser.beamReachY;
}

/** Player movement band Y used for fairness assertions. */
export function sodaLaserPlayerBandY(): number {
  return bullets.sodaLaser.playerBandY ?? GameBalance.bullet.sodaLaser.playerBandY;
}

export function planSodaLaserCorridor(sourceX: number, sourceY: number): SodaLaserCorridorPlan {
  const def = bullets.sodaLaser;
  const halfWidthPx = def.beamHalfWidthPx ?? 10;
  const sourceOffsetY = def.beamSourceOffsetY ?? 16;
  const endY = sodaLaserReachY();
  const topY = sourceY + sourceOffsetY;
  const heightPx = Math.max(8, endY - topY);
  const centerY = topY + heightPx / 2;
  return {
    laneX: sourceX,
    sourceY,
    topY,
    endY,
    centerY,
    heightPx,
    widthPx: halfWidthPx * 2,
    halfWidthPx,
    telegraphMs: def.telegraphMs ?? 600,
    beamDurationMs: def.beamDurationMs ?? 350,
    hazardSlots: 1,
  };
}

/** True when a point at (x,y) overlaps the active beam corridor AABB. */
export function sodaLaserHitsPoint(plan: SodaLaserCorridorPlan, x: number, y: number): boolean {
  if (y < plan.topY) return false;
  if (y > plan.endY) return false;
  return Math.abs(x - plan.laneX) <= plan.halfWidthPx;
}

export type SodaLaserHazardSprite = {
  setDisplaySize: (w: number, h: number) => void;
  setPosition: (x: number, y: number) => void;
  setData: (key: string, value: unknown) => void;
  frame: { width: number; height: number };
  body: { setSize: (w: number, h: number) => void; setOffset: (x: number, y: number) => void };
};

/**
 * Applies continuous long-range geometry to one acquired laser sprite.
 * Visual display size and Arcade body world size stay matched.
 */
export function applySodaLaserHazardGeometry(
  sprite: SodaLaserHazardSprite,
  plan: SodaLaserCorridorPlan,
  expiresAtMs: number,
): void {
  sprite.setPosition(plan.laneX, plan.centerY);
  sprite.setDisplaySize(plan.widthPx, plan.heightPx);
  sprite.body.setSize(sprite.frame.width, sprite.frame.height);
  sprite.body.setOffset(0, 0);
  sprite.setData('expiresAtMs', expiresAtMs);
  sprite.setData('sodaLaserLaneX', plan.laneX);
  sprite.setData('sodaLaserEndY', plan.endY);
  sprite.setData('sodaLaserTopY', plan.topY);
  sprite.setData('laserHazard', true);
}

/**
 * Acquires exactly one hazard sprite and stamps full-corridor geometry.
 * Caller supplies acquire() from the dedicated laser pool — never the shared
 * enemy projectile pool — so remaining normal-bullet capacity cannot shorten reach.
 */
export function spawnSodaLaserHazard(
  plan: SodaLaserCorridorPlan,
  acquire: (x: number, y: number) => SodaLaserHazardSprite | null,
  nowMs: number,
): { fired: number; sprite: SodaLaserHazardSprite | null } {
  const sprite = acquire(plan.laneX, plan.centerY);
  if (!sprite) return { fired: 0, sprite: null };
  applySodaLaserHazardGeometry(sprite, plan, nowMs + plan.beamDurationMs);
  return { fired: 1, sprite };
}
