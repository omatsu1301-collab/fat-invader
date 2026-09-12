import { describe, expect, it } from 'vitest';
import { validateContentCatalog } from '../../../src/game/content/validate';
import { REQUIRED_ATTACK_COMBINATIONS } from '../../../src/game/content/patterns';
import { STAGE_ORDER } from '../../../src/game/content/stages';
import { POWERUP_IDS } from '../../../src/game/content/powerups';
import { bosses } from '../../../src/game/content/bosses';
import { enemies } from '../../../src/game/content/enemies';

describe('content catalog validation (AC-306)', () => {
  it('passes with no cross-reference errors', () => {
    const result = validateContentCatalog();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('covers Full Graybox minimum counts', () => {
    expect(Object.keys(enemies).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(bosses).length).toBeGreaterThanOrEqual(3);
    expect(POWERUP_IDS.length).toBeGreaterThanOrEqual(5);
    expect(REQUIRED_ATTACK_COMBINATIONS.length).toBeGreaterThanOrEqual(10);
    expect(STAGE_ORDER).toHaveLength(3);
  });
});
