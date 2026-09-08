import { describe, expect, it } from 'vitest';
import { WaveSystem } from '../../../src/game/systems/WaveSystem';
import type { WaveDefinition } from '../../../src/game/content/waves';

const wave: WaveDefinition = {
  id: 'testWave',
  stageId: 'stage1',
  completion: 'ALL_DEFEATED',
  spawns: [
    { atMs: 0, enemyId: 'fryScout', gridX: 0, gridY: 0 },
    { atMs: 100, enemyId: 'fryScout', gridX: 1, gridY: 0 },
    { atMs: 300, enemyId: 'fryScout', gridX: 2, gridY: 0 },
  ],
};

describe('WaveSystem', () => {
  it('releases spawn commands only once their scheduled time has passed', () => {
    const system = new WaveSystem(wave, 1000);
    expect(system.collectDueSpawns(1000)).toHaveLength(1);
    expect(system.collectDueSpawns(1000)).toHaveLength(0); // no repeats
    expect(system.collectDueSpawns(1099)).toHaveLength(0);
    expect(system.collectDueSpawns(1100)).toHaveLength(1);
    expect(system.collectDueSpawns(1500)).toHaveLength(1);
    expect(system.allSpawned()).toBe(true);
  });

  it('completes only once all spawns are out and no enemies remain (FI-03 section 9)', () => {
    const system = new WaveSystem(wave, 0);
    system.collectDueSpawns(0);
    expect(system.checkCompletion(1)).toBe(false); // not all spawned yet
    expect(system.checkCompletion(0)).toBe(false); // still not all spawned, even with 0 alive

    system.collectDueSpawns(300);
    expect(system.allSpawned()).toBe(true);
    expect(system.checkCompletion(2)).toBe(false); // enemies still alive
    expect(system.checkCompletion(0)).toBe(true); // all spawned and none remain
  });

  it('never issues a spawn after completion', () => {
    const system = new WaveSystem(wave, 0);
    system.collectDueSpawns(1000);
    expect(system.checkCompletion(0)).toBe(true);
    expect(system.collectDueSpawns(2000)).toHaveLength(0);
  });
});
