import { describe, expect, it } from 'vitest';
import {
  resetProjectileForReuse,
  updateSineProjectiles,
} from '../../../src/game/entities/Projectile';

type FakeSprite = {
  x: number;
  y: number;
  active: boolean;
  data: Map<string, unknown>;
  scaleX: number;
  scaleY: number;
  angle: number;
  rotation: number;
  alpha: number;
  tintCleared: boolean;
  setData: (k: string, v: unknown) => void;
  getData: (k: string) => unknown;
  setScale: (x?: number, y?: number) => void;
  setAngle: (d: number) => void;
  setRotation: (r: number) => void;
  setAlpha: (a: number) => void;
  clearTint: () => void;
};

function createSprite(x: number): FakeSprite {
  const data = new Map<string, unknown>();
  const sprite: FakeSprite = {
    x,
    y: 100,
    active: true,
    data,
    scaleX: 2,
    scaleY: 3,
    angle: 45,
    rotation: 1,
    alpha: 0.4,
    tintCleared: false,
    setData(k, v) {
      if (v === undefined) data.delete(k);
      else data.set(k, v);
    },
    getData(k) {
      return data.get(k);
    },
    setScale(sx = 1, sy = sx) {
      sprite.scaleX = sx;
      sprite.scaleY = sy;
    },
    setAngle(d) {
      sprite.angle = d;
    },
    setRotation(r) {
      sprite.rotation = r;
    },
    setAlpha(a) {
      sprite.alpha = a;
    },
    clearTint() {
      sprite.tintCleared = true;
    },
  };
  return sprite;
}

describe('projectile pool reuse reset contract', () => {
  it('clears DONUT sine so reused FRY is not overwritten by stale sine metadata', () => {
    const sprite = createSprite(120);
    sprite.setData('sine', {
      originX: 10,
      amplitude: 40,
      periodMs: 900,
      bornAtMs: 0,
      baseVx: 0,
    });
    sprite.setData('expiresAtMs', 9999);
    sprite.setData('sodaLaserLaneX', 50);
    sprite.setData('sodaLaserEndY', 760);
    sprite.setData('sodaLaserTopY', 100);
    sprite.setData('laserHazard', true);
    sprite.setData('payload', { bulletId: 'donut' });

    resetProjectileForReuse(sprite);

    expect(sprite.getData('sine')).toBeUndefined();
    expect(sprite.getData('expiresAtMs')).toBeUndefined();
    expect(sprite.getData('sodaLaserLaneX')).toBeUndefined();
    expect(sprite.getData('sodaLaserEndY')).toBeUndefined();
    expect(sprite.getData('sodaLaserTopY')).toBeUndefined();
    expect(sprite.getData('laserHazard')).toBeUndefined();
    expect(sprite.getData('payload')).toBeUndefined();
    expect(sprite.scaleX).toBe(1);
    expect(sprite.scaleY).toBe(1);
    expect(sprite.angle).toBe(0);
    expect(sprite.rotation).toBe(0);
    expect(sprite.alpha).toBe(1);
    expect(sprite.tintCleared).toBe(true);

    // Reuse as FRY at a new X — sine updater must leave X alone.
    sprite.x = 200;
    sprite.setData('payload', { bulletId: 'fry' });
    const group = {
      children: [sprite],
    };
    updateSineProjectiles(group as never, 450);
    expect(sprite.x).toBe(200);
  });

  it.each(['fry', 'donut', 'pizzaSlice', 'tapioca', 'cake', 'sodaLaser'] as const)(
    'cleans runtime state before issuing %s',
    (bulletId) => {
      const sprite = createSprite(80);
      sprite.setData('sine', { originX: 1, amplitude: 1, periodMs: 1, bornAtMs: 0, baseVx: 0 });
      sprite.setData('expiresAtMs', 1);
      sprite.setData('laserHazard', true);
      resetProjectileForReuse(sprite);
      sprite.setData('payload', { bulletId });
      expect(sprite.getData('sine')).toBeUndefined();
      expect(sprite.getData('expiresAtMs')).toBeUndefined();
      expect(sprite.getData('laserHazard')).toBeUndefined();
      expect(sprite.getData('payload')).toEqual({ bulletId });
    },
  );
});
