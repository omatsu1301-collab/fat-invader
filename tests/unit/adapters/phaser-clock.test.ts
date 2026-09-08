import { describe, expect, it } from 'vitest';
import { PhaserClock } from '../../../src/game/adapters/PhaserClock';

describe('PhaserClock', () => {
  it('advances gameTimeMs only while running', () => {
    const clock = new PhaserClock();
    clock.tick(16, true);
    expect(clock.nowMs()).toBe(16);
    clock.tick(16, false);
    expect(clock.nowMs()).toBe(16);
    expect(clock.lastDeltaMs()).toBe(0);
    clock.tick(16, true);
    expect(clock.nowMs()).toBe(32);
  });

  it('clamps a single frame delta to 50ms', () => {
    const clock = new PhaserClock();
    clock.tick(500, true);
    expect(clock.lastDeltaMs()).toBe(50);
    expect(clock.nowMs()).toBe(50);
  });
});
