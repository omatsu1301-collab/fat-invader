import { describe, expect, it } from 'vitest';
import { patternTelegraphMs } from '../../../src/game/content/patterns';
import { GameBalance } from '../../../src/game/config/balance';

describe('pattern telegraph (AC-320)', () => {
  it('gives soda laser at least 600ms tell', () => {
    expect(patternTelegraphMs('sodaLaser')).toBeGreaterThanOrEqual(600);
    expect(GameBalance.bullet.sodaLaser.telegraphMs).toBeGreaterThanOrEqual(600);
  });

  it('gives pizza slice and cake caster tells >= 600ms', () => {
    expect(patternTelegraphMs('pizzaSliceTelegraph')).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('cakeLargeSlow')).toBeGreaterThanOrEqual(600);
    expect(patternTelegraphMs('tapiocaLaserComposite')).toBeGreaterThanOrEqual(600);
  });

  it('returns 0 for non-telegraph patterns', () => {
    expect(patternTelegraphMs('fryStraight')).toBe(0);
    expect(patternTelegraphMs('fry3Way')).toBe(0);
  });
});
