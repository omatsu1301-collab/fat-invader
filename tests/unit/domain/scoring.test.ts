import { describe, expect, it } from 'vitest';
import { bossNoHitBonus, killScore, stageClearBonus } from '../../../src/game/domain/scoring';

describe('scoring', () => {
  it('multiplies base score by the combo multiplier deterministically (AC-124)', () => {
    expect(killScore(100, 0)).toBe(100);
    expect(killScore(100, 5)).toBe(200);
    expect(killScore(100, 10)).toBe(400);
    // Same inputs must always produce the same output.
    expect(killScore(100, 10)).toBe(killScore(100, 10));
  });

  it('scales stage clear and boss no-hit bonuses by stage number', () => {
    expect(stageClearBonus(1, 5000)).toBe(5000);
    expect(stageClearBonus(3, 5000)).toBe(15000);
    expect(bossNoHitBonus(1, 3000)).toBe(3000);
  });
});
