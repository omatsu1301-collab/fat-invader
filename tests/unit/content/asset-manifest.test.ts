import { describe, expect, it } from 'vitest';
import { NORTH_STAR_ASSETS } from '../../../src/game/content/asset-manifest';

describe('asset-manifest North Star (FI-10)', () => {
  it('contains exactly five North Star entries', () => {
    expect(NORTH_STAR_ASSETS).toHaveLength(5);
    expect(NORTH_STAR_ASSETS.every((a) => a.northStar)).toBe(true);
  });

  it('has unique asset ids and texture keys', () => {
    const ids = NORTH_STAR_ASSETS.map((a) => a.id);
    const keys = NORTH_STAR_ASSETS.map((a) => a.textureKey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses base-relative runtime paths without leading /assets', () => {
    for (const asset of NORTH_STAR_ASSETS) {
      expect(asset.runtimePath.startsWith('assets/')).toBe(true);
      expect(asset.runtimePath.startsWith('/')).toBe(false);
      expect(asset.runtimePath.startsWith('/assets/')).toBe(false);
    }
  });

  it('enforces master = runtime × 4 and required provenance', () => {
    for (const asset of NORTH_STAR_ASSETS) {
      expect(asset.masterWidth).toBe(asset.runtimeWidth * 4);
      expect(asset.masterHeight).toBe(asset.runtimeHeight * 4);
      expect(asset.rawSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(asset.license.termsUrl).toContain('openai.com');
      expect(asset.license.termsEffectiveOn).toBe('2026-01-01');
      expect(asset.license.termsCheckedOn).toBe('2026-09-10');
      expect(asset.license.similarityRiskReviewed).toBe(true);
      expect(asset.humanDecision).toContain('PASS');
      expect(asset.processingHistory.length).toBeGreaterThan(0);
    }
  });

  it('locks pilot runtime canvases and player-bullet body', () => {
    const player = NORTH_STAR_ASSETS.find((a) => a.id === 'pixel.player.sannichibouzu.idle');
    const playerBullet = NORTH_STAR_ASSETS.find(
      (a) => a.id === 'pixel.bullet.playerCrumpledCheckup',
    );
    const fry = NORTH_STAR_ASSETS.find((a) => a.id === 'pixel.bullet.goldenFry');
    expect(player?.runtimeWidth).toBe(40);
    expect(player?.hitbox).toEqual({ width: 24, height: 28, offsetX: 8, offsetY: 6 });
    expect(playerBullet?.runtimeWidth).toBe(12);
    expect(playerBullet?.runtimeHeight).toBe(16);
    expect(playerBullet?.hitbox).toEqual({ width: 6, height: 16, offsetX: 3, offsetY: 0 });
    expect(fry?.hitbox).toEqual({ width: 14, height: 14, offsetX: 0, offsetY: 0 });
  });
});
