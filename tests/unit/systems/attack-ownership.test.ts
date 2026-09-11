import { describe, expect, it, beforeEach } from 'vitest';
import {
  allocateEnemySpawnGeneration,
  resetEnemySpawnGenerationCounter,
  type EnemyRuntimeData,
} from '../../../src/game/entities/Enemy';
import {
  isBossTelegraphOwnerValid,
  isEnemyTelegraphOwnerValid,
} from '../../../src/game/systems/attackOwnership';

function enemySprite(runtime: EnemyRuntimeData, active = true) {
  return {
    active,
    getData: (key: string) => (key === 'enemy' ? runtime : undefined),
  };
}

function runtime(generation: number): EnemyRuntimeData {
  return {
    enemyId: 'pizzaCutter',
    hp: 1,
    baseX: 100,
    baseY: 120,
    spawnedAtMs: 0,
    nextFireAtMs: 0,
    lastFireDelayMs: 0,
    formationPhaseOffset: 0,
    firePattern: 'pizzaSliceTelegraph',
    shotIndex: 0,
    spawnGeneration: generation,
    chargeState: 'idle',
    chargeUntilMs: 0,
    chargeDir: 1,
  };
}

describe('delayed telegraph attack ownership', () => {
  beforeEach(() => {
    resetEnemySpawnGenerationCounter(1);
  });

  it('allocates a new spawnGeneration per life', () => {
    expect(allocateEnemySpawnGeneration()).toBe(1);
    expect(allocateEnemySpawnGeneration()).toBe(2);
  });

  it('fires when the same enemy life survives telegraph', () => {
    const gen = allocateEnemySpawnGeneration();
    const sprite = enemySprite(runtime(gen), true);
    expect(isEnemyTelegraphOwnerValid(sprite, gen, true)).toBe(true);
  });

  it('does not fire after deactivate + pooled reuse as a new enemy life', () => {
    const genA = allocateEnemySpawnGeneration();
    const sprite = enemySprite(runtime(genA), true);

    // Enemy A dies; same object reused as Enemy B with a new generation.
    const genB = allocateEnemySpawnGeneration();
    sprite.active = true;
    const runtimeB = runtime(genB);
    const reused = {
      active: true,
      getData: (key: string) => (key === 'enemy' ? runtimeB : undefined),
    };

    expect(isEnemyTelegraphOwnerValid(reused, genA, true)).toBe(false);
    expect(isEnemyTelegraphOwnerValid(reused, genB, true)).toBe(true);
  });

  it('does not fire when phase is invalid even if sprite is active', () => {
    const gen = allocateEnemySpawnGeneration();
    const sprite = enemySprite(runtime(gen), true);
    expect(isEnemyTelegraphOwnerValid(sprite, gen, false)).toBe(false);
  });

  it('rejects boss telegraph when fightGeneration mismatches', () => {
    const boss = { fightGeneration: 3, sprite: { active: true } };
    expect(isBossTelegraphOwnerValid(boss, 3, true)).toBe(true);
    expect(isBossTelegraphOwnerValid(boss, 2, true)).toBe(false);
    expect(isBossTelegraphOwnerValid(null, 3, true)).toBe(false);
  });
});
