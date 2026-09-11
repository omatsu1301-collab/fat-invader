import { GameBalance } from '../config/balance';
import { bullets } from '../content/bullets';

/**
 * Pure soda-laser corridor plan shared by PatternSystem, tell graphics, and
 * fairness tests. Lane X is fixed at telegraph start; reach covers the player
 * movement band down to beamReachY (playfield bottom).
 */
export type SodaLaserCorridorPlan = {
  laneX: number;
  sourceY: number;
  firstSegmentY: number;
  endY: number;
  widthPx: number;
  halfWidthPx: number;
  segmentSpacingPx: number;
  segmentYs: number[];
  telegraphMs: number;
  beamDurationMs: number;
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
  const segmentSpacingPx = def.beamSegmentSpacingPx ?? 32;
  const sourceOffsetY = def.beamSourceOffsetY ?? 16;
  const endY = sodaLaserReachY();
  const firstSegmentY = sourceY + sourceOffsetY;
  const segmentYs: number[] = [];
  if (firstSegmentY <= endY) {
    for (let y = firstSegmentY; y <= endY + 0.001; y += segmentSpacingPx) {
      segmentYs.push(y);
    }
    const last = segmentYs[segmentYs.length - 1];
    if (last === undefined || last < endY - 1) {
      segmentYs.push(endY);
    }
  }
  return {
    laneX: sourceX,
    sourceY,
    firstSegmentY,
    endY,
    widthPx: halfWidthPx * 2,
    halfWidthPx,
    segmentSpacingPx,
    segmentYs,
    telegraphMs: def.telegraphMs ?? 600,
    beamDurationMs: def.beamDurationMs ?? 350,
  };
}

/** True when a point at (x,y) overlaps the active beam corridor AABB. */
export function sodaLaserHitsPoint(plan: SodaLaserCorridorPlan, x: number, y: number): boolean {
  if (y < plan.firstSegmentY - plan.segmentSpacingPx * 0.5) return false;
  if (y > plan.endY + plan.segmentSpacingPx * 0.5) return false;
  return Math.abs(x - plan.laneX) <= plan.halfWidthPx;
}
