import { describe, expect, it } from 'vitest';
import { appearanceTintForTier } from '../../../src/game/entities/Player';
import { projectileBodyForBulletId } from '../../../src/game/entities/Projectile';

describe('Player appearance tint pilot (AC-117 adjacent)', () => {
  it('does not cyan-wash the light tier authored sprite', () => {
    expect(appearanceTintForTier('light')).toBeNull();
  });

  it('keeps temporary tint signaling for higher tiers', () => {
    expect(appearanceTintForTier('rounded')).toBe(0x8ff2ff);
    expect(appearanceTintForTier('heavy')).toBe(0xbfe9ff);
    expect(appearanceTintForTier('overflowing')).toBe(0xffd7dc);
  });
});

describe('projectile body preservation', () => {
  it('keeps playerShot collision at 6×16 with offset (3,0) despite 12×16 canvas', () => {
    expect(projectileBodyForBulletId('playerShot')).toEqual({
      width: 6,
      height: 16,
      offsetX: 3,
      offsetY: 0,
    });
  });

  it('keeps fry collision at 14×14', () => {
    expect(projectileBodyForBulletId('fry')).toEqual({
      width: 14,
      height: 14,
      offsetX: 0,
      offsetY: 0,
    });
  });
});
