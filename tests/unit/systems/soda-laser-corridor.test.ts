import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import { patternTelegraphMs } from '../../../src/game/content/patterns';
import {
  applySodaLaserHazardGeometry,
  planSodaLaserCorridor,
  sodaLaserHitsPoint,
  sodaLaserPlayerBandY,
  sodaLaserReachY,
  spawnSodaLaserHazard,
  type SodaLaserHazardSprite,
} from '../../../src/game/systems/sodaLaser';

type FakeSprite = SodaLaserHazardSprite & {
  active: boolean;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  data: Map<string, unknown>;
  getData: (k: string) => unknown;
};

function createFakeSprite(): FakeSprite {
  const data = new Map<string, unknown>();
  const sprite: FakeSprite = {
    active: false,
    x: 0,
    y: 0,
    displayWidth: 18,
    displayHeight: 18,
    frame: { width: 18, height: 18 },
    body: {
      setSize: () => undefined,
      setOffset: () => undefined,
    },
    data,
    setDisplaySize(w, h) {
      sprite.displayWidth = w;
      sprite.displayHeight = h;
    },
    setPosition(x, y) {
      sprite.x = x;
      sprite.y = y;
    },
    setData(k, v) {
      data.set(k, v);
    },
    getData(k) {
      return data.get(k);
    },
  };
  return sprite;
}

function createLaserPool(capacity: number) {
  const pool = Array.from({ length: capacity }, () => createFakeSprite());
  let next = 0;
  let enemyPoolGets = 0;
  return {
    enemyPoolGets: () => enemyPoolGets,
    bumpEnemyPoolGet() {
      enemyPoolGets += 1;
    },
    acquire(x: number, y: number): FakeSprite | null {
      if (next >= capacity) return null;
      const sprite = pool[next]!;
      next += 1;
      sprite.active = true;
      sprite.setPosition(x, y);
      return sprite;
    },
    sprites: pool,
    issued: () => next,
  };
}

describe('sodaLaser long-hazard architecture', () => {
  const playfieldWidth = 390;
  const enemyX = playfieldWidth / 2;
  const enemyY = 160;
  const plan = planSodaLaserCorridor(enemyX, enemyY);

  it('uses exactly one dedicated hazard slot (not N normal projectile segments)', () => {
    expect(plan.hazardSlots).toBe(1);
    expect(GameBalance.pools.sodaLaser).toBeGreaterThanOrEqual(1);
    expect(GameBalance.pools.sodaLaser).toBeLessThan(GameBalance.pools.enemyProjectile);
  });

  it('requires telegraph >= 600ms and shares contract with tapiocaLaserComposite', () => {
    expect(plan.telegraphMs).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('sodaLaser')).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('tapiocaLaserComposite')).toBe(patternTelegraphMs('sodaLaser'));
    expect(plan.beamDurationMs).toBe(350);
  });

  it('covers player band continuously on one geometry', () => {
    const playerBandY = sodaLaserPlayerBandY();
    expect(plan.endY).toBe(sodaLaserReachY());
    expect(plan.endY).toBeGreaterThanOrEqual(playerBandY);
    expect(plan.topY).toBeLessThan(playerBandY);
    expect(plan.heightPx).toBeGreaterThan(playfieldWidth);
    expect(sodaLaserHitsPoint(plan, plan.laneX, playerBandY)).toBe(true);
  });

  it('keeps tell/active/collision on the same lane with a horizontal safe path', () => {
    expect(plan.laneX).toBe(enemyX);
    const safeX = plan.laneX + plan.widthPx + 24;
    expect(sodaLaserHitsPoint(plan, safeX, sodaLaserPlayerBandY())).toBe(false);
    expect(plan.widthPx).toBeLessThan(playfieldWidth * 0.2);
  });

  it('still reaches player band when a separate normal projectile pool would be full', () => {
    const laserPool = createLaserPool(GameBalance.pools.sodaLaser);
    // Simulate saturated enemy projectile pool: many gets, zero laser impact.
    for (let i = 0; i < GameBalance.pools.enemyProjectile; i += 1) {
      laserPool.bumpEnemyPoolGet();
    }
    expect(laserPool.enemyPoolGets()).toBe(GameBalance.pools.enemyProjectile);

    const result = spawnSodaLaserHazard(plan, (x, y) => laserPool.acquire(x, y), 1000);
    expect(result.fired).toBe(1);
    expect(laserPool.issued()).toBe(1);
    expect(result.sprite).toBeTruthy();
    const hazard = result.sprite as FakeSprite;
    expect(hazard.displayHeight).toBe(plan.heightPx);
    expect(hazard.displayWidth).toBe(plan.widthPx);
    expect(hazard.getData('sodaLaserLaneX')).toBe(plan.laneX);
    expect(hazard.getData('sodaLaserEndY')).toBe(plan.endY);
    expect(hazard.y + hazard.displayHeight / 2).toBeGreaterThanOrEqual(sodaLaserPlayerBandY());
  });

  it('laser range does not shrink when normal pool remaining capacity changes', () => {
    const laserA = createLaserPool(GameBalance.pools.sodaLaser);
    const laserB = createLaserPool(GameBalance.pools.sodaLaser);
    const planShared = planSodaLaserCorridor(120, 140);

    const a = spawnSodaLaserHazard(planShared, (x, y) => laserA.acquire(x, y), 1000);
    const b = spawnSodaLaserHazard(planShared, (x, y) => laserB.acquire(x, y), 1000);
    expect((a.sprite as FakeSprite).displayHeight).toBe((b.sprite as FakeSprite).displayHeight);
    expect((a.sprite as FakeSprite).displayHeight).toBe(planShared.heightPx);
    expect((a.sprite as FakeSprite).getData('sodaLaserEndY')).toBe(planShared.endY);
  });

  it('applies matching visual and collision geometry from the same plan', () => {
    const sprite = createFakeSprite();
    applySodaLaserHazardGeometry(sprite, plan, 1350);
    expect(sprite.displayWidth).toBe(plan.widthPx);
    expect(sprite.displayHeight).toBe(plan.heightPx);
    expect(sprite.x).toBe(plan.laneX);
    expect(sprite.y).toBe(plan.centerY);
    expect(sprite.getData('sodaLaserTopY')).toBe(plan.topY);
    expect(sprite.getData('sodaLaserEndY')).toBe(plan.endY);
  });

  it('allows simultaneous lasers within the dedicated sodaLaser pool', () => {
    const laserPool = createLaserPool(GameBalance.pools.sodaLaser);
    let fired = 0;
    for (let i = 0; i < GameBalance.pools.sodaLaser; i += 1) {
      fired += spawnSodaLaserHazard(
        planSodaLaserCorridor(40 + i * 20, 150),
        (x, y) => laserPool.acquire(x, y),
        1000,
      ).fired;
    }
    expect(fired).toBe(GameBalance.pools.sodaLaser);
    const overflow = spawnSodaLaserHazard(plan, (x, y) => laserPool.acquire(x, y), 1000);
    expect(overflow.fired).toBe(0);
  });
});
