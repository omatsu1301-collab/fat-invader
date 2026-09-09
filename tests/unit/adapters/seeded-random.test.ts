import { describe, expect, it } from 'vitest';
import { createRunRandomSources, SeededRandom } from '../../../src/game/adapters/SeededRandom';

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed (FI-03 section 15)', () => {
    const a = new SeededRandom('fixed-seed');
    const b = new SeededRandom('fixed-seed');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom('seed-a');
    const b = new SeededRandom('seed-b');
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('stays within [0, 1)', () => {
    const r = new SeededRandom('range-check');
    for (let i = 0; i < 200; i += 1) {
      const value = r.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('nextInt is inclusive of both bounds', () => {
    const r = new SeededRandom('int-check');
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      seen.add(r.nextInt(0, 3));
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('keeps gameplay and VFX streams independent for the same run seed', () => {
    const a = createRunRandomSources('run-seed');
    const b = createRunRandomSources('run-seed');
    const extraVfx = Array.from({ length: 40 }, () => a.vfxRandom.next());
    const gameplayA = Array.from({ length: 12 }, () => a.gameplayRandom.next());
    const gameplayB = Array.from({ length: 12 }, () => b.gameplayRandom.next());
    const vfxB = Array.from({ length: 40 }, () => b.vfxRandom.next());
    expect(gameplayA).toEqual(gameplayB);
    expect(extraVfx).toEqual(vfxB);
    expect(gameplayA).not.toEqual(extraVfx.slice(0, 12));
  });
});
