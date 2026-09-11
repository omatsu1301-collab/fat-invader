import { describe, expect, it } from 'vitest';
import {
  pickByIdentity,
  resolveEnemyHits,
  resolveFirstPlayerHit,
} from '../../../src/game/systems/CombatSystem';
import type { PendingEnemyHit } from '../../../src/game/systems/CombatSystem';
import type { EnemyRuntimeData } from '../../../src/game/entities/Enemy';

type FakeSprite = {
  active: boolean;
  getData: (key: string) => unknown;
};

function fakeEnemySprite(runtime: EnemyRuntimeData, active = true): FakeSprite {
  return {
    active,
    getData: (key: string) => (key === 'enemy' ? runtime : undefined),
  };
}

function runtimeFor(hp: number): EnemyRuntimeData {
  return {
    enemyId: 'fryScout',
    hp,
    baseX: 0,
    baseY: 0,
    spawnedAtMs: 0,
    nextFireAtMs: 0,
    lastFireDelayMs: 0,
    formationPhaseOffset: 0,
    firePattern: 'fryStraight',
    shotIndex: 0,
    spawnGeneration: 1,
    chargeState: 'idle',
    chargeUntilMs: 0,
    chargeDir: 1,
  };
}

describe('CombatSystem.resolveEnemyHits', () => {
  it('kills an enemy once its HP reaches 0 (AC-110/111)', () => {
    const runtime = runtimeFor(1);
    const sprite = fakeEnemySprite(runtime);
    const hit: PendingEnemyHit = { sprite: sprite as never, damage: 1, x: 10, y: 20 };

    const outcomes = resolveEnemyHits([hit]);
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]!.killed).toBe(true);
    expect(outcomes[0]!.score).toBe(100);
  });

  it('never double-kills or double-scores the same enemy in one resolve pass (FI-03 section 13)', () => {
    const runtime = runtimeFor(1);
    const sprite = fakeEnemySprite(runtime);
    const hits: PendingEnemyHit[] = [
      { sprite: sprite as never, damage: 1, x: 0, y: 0 },
      { sprite: sprite as never, damage: 1, x: 0, y: 0 },
    ];

    const outcomes = resolveEnemyHits(hits);
    const killedOutcomes = outcomes.filter((o) => o.killed);
    expect(killedOutcomes).toHaveLength(1);
  });

  it('ignores hits against an already-inactive sprite', () => {
    const runtime = runtimeFor(1);
    const sprite = fakeEnemySprite(runtime, false);
    const outcomes = resolveEnemyHits([{ sprite: sprite as never, damage: 1, x: 0, y: 0 }]);
    expect(outcomes).toHaveLength(0);
  });
});

describe('CombatSystem.resolveFirstPlayerHit', () => {
  it('lets the first queued hit land when not invulnerable', () => {
    const result = resolveFirstPlayerHit(
      [
        { calorie: 10, source: 'bullet' },
        { calorie: 20, source: 'bullet' },
      ],
      false,
    );
    expect(result).toEqual({ calorie: 10, source: 'bullet' });
  });

  it('suppresses all hits while invulnerable (AC-114)', () => {
    const result = resolveFirstPlayerHit([{ calorie: 10, source: 'bullet' }], true);
    expect(result).toBeNull();
  });

  it('returns null when nothing is queued', () => {
    expect(resolveFirstPlayerHit([], false)).toBeNull();
  });
});

/**
 * Root cause of the Human Gate 1 P1 bug: `onPlayerProjectileHitsBoss`
 * deactivated whichever argument was passed first, assuming Arcade Physics
 * always calls the overlap callback as (groupMember, singleSprite). That
 * assumption is not guaranteed — this proves the fix (identity-based
 * discrimination) is correct regardless of which order the two arguments
 * arrive in.
 */
describe('CombatSystem.pickByIdentity', () => {
  const bossSprite = { id: 'boss' };
  const projSprite = { id: 'proj' };
  const isBoss = (candidate: typeof bossSprite | typeof projSprite): boolean =>
    candidate === bossSprite;

  it('finds the match when it is the first argument', () => {
    const result = pickByIdentity(bossSprite, projSprite, isBoss);
    expect(result).toEqual({ match: bossSprite, other: projSprite });
  });

  it('finds the match when it is the second argument (the previously-unhandled order)', () => {
    const result = pickByIdentity(projSprite, bossSprite, isBoss);
    expect(result).toEqual({ match: bossSprite, other: projSprite });
  });

  it('returns null when neither argument matches', () => {
    const somethingElse = { id: 'other' };
    const result = pickByIdentity(somethingElse, projSprite, isBoss);
    expect(result).toBeNull();
  });
});
