import { describe, expect, it } from 'vitest';
import { applyCalorie, calorieTier, isFatOver } from '../../../src/game/domain/calorie';

describe('calorie', () => {
  it('clamps to [0, 100] (AC-113)', () => {
    expect(applyCalorie(0, -50)).toBe(0);
    expect(applyCalorie(95, 50)).toBe(100);
    expect(applyCalorie(10, 5)).toBe(15);
  });

  it('switches appearance tier exactly at 24/25, 49/50, 74/75 (AC-116)', () => {
    expect(calorieTier(0)).toBe('light');
    expect(calorieTier(24)).toBe('light');
    expect(calorieTier(25)).toBe('rounded');
    expect(calorieTier(49)).toBe('rounded');
    expect(calorieTier(50)).toBe('heavy');
    expect(calorieTier(74)).toBe('heavy');
    expect(calorieTier(75)).toBe('overflowing');
    expect(calorieTier(99)).toBe('overflowing');
  });

  it('reports FAT OVER only at >= 100', () => {
    expect(isFatOver(99)).toBe(false);
    expect(isFatOver(100)).toBe(true);
  });
});
