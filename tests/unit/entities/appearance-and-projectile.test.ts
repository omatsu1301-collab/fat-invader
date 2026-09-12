import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import { appearanceTintForTier, displayScaleForTier } from '../../../src/game/entities/Player';
import { projectileBodyForBulletId } from '../../../src/game/entities/Projectile';

describe('Player appearance tint (salaryman graybox)', () => {
  it('clears tint on light tier (no cyan wash)', () => {
    expect(appearanceTintForTier('light')).toBeNull();
  });

  it('keeps temporary tint signaling for higher tiers', () => {
    expect(appearanceTintForTier('rounded')).toBe(0x8ff2ff);
    expect(appearanceTintForTier('heavy')).toBe(0xbfe9ff);
    expect(appearanceTintForTier('overflowing')).toBe(0xffd7dc);
  });

  it('scales display only within 1.0–1.05 by tier', () => {
    expect(displayScaleForTier('light')).toBe(1);
    expect(displayScaleForTier('rounded')).toBeGreaterThanOrEqual(1);
    expect(displayScaleForTier('overflowing')).toBeLessThanOrEqual(1.05);
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

describe('Player hitbox contract (Combat Zone movement must not change)', () => {
  it('keeps 24×28 body with offset (8,6) from spriteSize and hitbox ratios', () => {
    const width = GameBalance.player.spriteSize;
    const hitboxW = width * GameBalance.player.hitboxWidthRatio;
    const hitboxH = width * GameBalance.player.hitboxHeightRatio;
    expect(hitboxW).toBe(24);
    expect(hitboxH).toBe(28);
    expect((width - hitboxW) / 2).toBe(8);
    expect((width - hitboxH) / 2).toBe(6);
  });
});
