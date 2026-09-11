import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import { patternTelegraphMs } from '../../../src/game/content/patterns';
import {
  planSodaLaserCorridor,
  sodaLaserHitsPoint,
  sodaLaserPlayerBandY,
  sodaLaserReachY,
} from '../../../src/game/systems/sodaLaser';

describe('sodaLaser long-range fairness contract', () => {
  const playfieldWidth = 390;
  const playfieldHeight = 844;
  const enemyX = playfieldWidth / 2;
  const enemyY = 160;
  const plan = planSodaLaserCorridor(enemyX, enemyY);

  it('requires telegraph >= 600ms for sodaLaser and tapiocaLaserComposite', () => {
    expect(plan.telegraphMs).toBeGreaterThanOrEqual(600);
    expect(GameBalance.bullet.sodaLaser.telegraphMs).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('sodaLaser')).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('tapiocaLaserComposite')).toBe(patternTelegraphMs('sodaLaser'));
  });

  it('extends telegraph/hazard reach into the player movement band', () => {
    const playerBandY = sodaLaserPlayerBandY();
    expect(plan.endY).toBe(sodaLaserReachY());
    expect(plan.endY).toBeGreaterThanOrEqual(playerBandY);
    expect(plan.segmentYs.some((y) => y >= playerBandY)).toBe(true);
    expect(Math.max(...plan.segmentYs)).toBeGreaterThanOrEqual(plan.endY - 1);
  });

  it('keeps tell lane and active beam lane identical (no post-tell tracking)', () => {
    expect(plan.laneX).toBe(enemyX);
    const movedPlayerPlan = planSodaLaserCorridor(enemyX, enemyY);
    expect(movedPlayerPlan.laneX).toBe(plan.laneX);
    expect(movedPlayerPlan.segmentYs.every((y) => Number.isFinite(y))).toBe(true);
  });

  it('leaves a clear horizontal safe path beside the beam', () => {
    const playerBandY = sodaLaserPlayerBandY();
    expect(sodaLaserHitsPoint(plan, plan.laneX, playerBandY)).toBe(true);
    const safeX = plan.laneX + plan.widthPx + 24;
    expect(safeX).toBeLessThan(playfieldWidth - 8);
    expect(sodaLaserHitsPoint(plan, safeX, playerBandY)).toBe(false);
    expect(plan.widthPx).toBeLessThan(playfieldWidth * 0.2);
  });

  it('stays under the enemy projectile pool cap for one corridor', () => {
    expect(plan.segmentYs.length).toBeGreaterThan(6);
    expect(plan.segmentYs.length).toBeLessThanOrEqual(GameBalance.pools.enemyProjectile);
    // tapioca spread (5) + laser corridor still fits the shared pool.
    expect(5 + plan.segmentYs.length).toBeLessThanOrEqual(GameBalance.pools.enemyProjectile);
  });

  it('uses the same corridor contract for composite reuse (shared planner)', () => {
    // tapiocaLaserComposite must call sodaLaser / planSodaLaserCorridor — not a fork.
    const compositeTell = patternTelegraphMs('tapiocaLaserComposite');
    const laserTell = patternTelegraphMs('sodaLaser');
    expect(compositeTell).toBe(laserTell);
    expect(GameBalance.bullet.sodaLaser.beamDurationMs).toBe(plan.beamDurationMs);
    expect(GameBalance.bullet.sodaLaser.beamHalfWidthPx * 2).toBe(plan.widthPx);
  });

  it('covers source→player band continuously without full-screen width', () => {
    expect(plan.firstSegmentY).toBeGreaterThan(enemyY);
    expect(plan.endY - plan.firstSegmentY).toBeGreaterThan(playfieldHeight * 0.5);
    expect(plan.widthPx).toBe(GameBalance.bullet.sodaLaser.beamHalfWidthPx * 2);
  });
});
