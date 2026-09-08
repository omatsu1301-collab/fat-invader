import { describe, expect, it } from 'vitest';
import { applyGameEvent, createRunState, freshComboState } from '../../../src/game/domain/run-state';
import type { RunReducerContext } from '../../../src/game/domain/run-state';

function ctx(overrides: Partial<RunReducerContext> = {}): RunReducerContext {
  return {
    nowMs: 0,
    comboWindowMs: 2000,
    comboState: freshComboState(),
    ...overrides,
  };
}

describe('run-state reducer', () => {
  it('accumulates score and combo on ENEMY_KILLED (AC-110/111)', () => {
    const run = createRunState('seed', 0);
    const { runState, comboState } = applyGameEvent(
      run,
      { type: 'ENEMY_KILLED', enemyId: 'fryScout', score: 100, combo: 1, x: 0, y: 0 },
      ctx(),
    );
    expect(runState.score).toBe(100);
    expect(runState.enemiesKilled).toBe(1);
    expect(comboState.combo).toBe(1);
  });

  it('increases CALORIE on PLAYER_HIT and resets combo (AC-112)', () => {
    const run = createRunState('seed', 0);
    const afterKill = applyGameEvent(
      run,
      { type: 'ENEMY_KILLED', enemyId: 'fryScout', score: 100, combo: 1, x: 0, y: 0 },
      ctx(),
    );
    const { runState, comboState } = applyGameEvent(
      afterKill.runState,
      { type: 'PLAYER_HIT', calorie: 10, total: 10 },
      ctx({ comboState: afterKill.comboState }),
    );
    expect(runState.calorie).toBe(10);
    expect(runState.combo).toBe(0);
    expect(comboState.combo).toBe(0);
  });

  it('triggers RUN_ENDED(FAT_OVER) exactly once at CALORIE 100 (AC-115)', () => {
    let run = createRunState('seed', 0);
    let combo = freshComboState();

    for (let i = 0; i < 9; i += 1) {
      const result = applyGameEvent(run, { type: 'PLAYER_HIT', calorie: 10, total: 0 }, ctx({ comboState: combo }));
      run = result.runState;
      combo = result.comboState;
    }
    expect(run.calorie).toBe(90);
    expect(run.endReason).toBeUndefined();

    const final = applyGameEvent(run, { type: 'PLAYER_HIT', calorie: 15, total: 0 }, ctx({ comboState: combo }));
    expect(final.runState.calorie).toBe(100);
    expect(final.runState.endReason).toBe('FAT_OVER');

    // A further hit after the run has ended must not double-fire or change stats.
    const afterEnd = applyGameEvent(
      final.runState,
      { type: 'PLAYER_HIT', calorie: 10, total: 0 },
      ctx({ comboState: final.comboState, nowMs: 5000 }),
    );
    expect(afterEnd.runState.calorie).toBe(100);
    expect(afterEnd.runState.endedAtGameTimeMs).toBe(final.runState.endedAtGameTimeMs);
  });

  it('never double-scores a kill once RUN_ENDED has been applied', () => {
    const run = createRunState('seed', 0);
    const ended = applyGameEvent(run, { type: 'RUN_ENDED', reason: 'CLEAR' }, ctx());
    const afterKill = applyGameEvent(
      ended.runState,
      { type: 'ENEMY_KILLED', enemyId: 'fryScout', score: 100, combo: 1, x: 0, y: 0 },
      ctx({ comboState: ended.comboState }),
    );
    expect(afterKill.runState.score).toBe(0);
    expect(afterKill.runState.enemiesKilled).toBe(0);
  });

  it('increments bossesKilled exactly once on BOSS_DEFEATED', () => {
    const run = createRunState('seed', 0);
    const { runState } = applyGameEvent(
      run,
      { type: 'BOSS_DEFEATED', bossId: 'kingBurgerMini' },
      ctx(),
    );
    expect(runState.bossesKilled).toBe(1);
  });

  it('accumulates caloriesDodged once per BULLET_DODGED event (AC-125)', () => {
    let run = createRunState('seed', 0);
    run = applyGameEvent(run, { type: 'BULLET_DODGED', calorie: 10 }, ctx()).runState;
    run = applyGameEvent(run, { type: 'BULLET_DODGED', calorie: 14 }, ctx()).runState;
    expect(run.caloriesDodged).toBe(24);
  });
});
