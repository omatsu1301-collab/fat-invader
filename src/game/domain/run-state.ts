import { applyCalorie, isFatOver } from './calorie';
import type { ComboState } from './combo';
import { comboMultiplier, createComboState, registerHit, registerKill } from './combo';
import type { GameEvent } from './events';
import { killScore } from './scoring';

export type RunEndReason = 'FAT_OVER' | 'CLEAR';

/** FI-03 section 10: the single aggregation source for HUD, Result, and save. */
export type RunState = {
  seed: string;
  stageIndex: number;
  waveIndex: number;
  score: number;
  combo: number;
  maxCombo: number;
  calorie: number;
  caloriesDodged: number;
  shotsFired: number;
  shotsHit: number;
  enemiesKilled: number;
  bossesKilled: number;
  startedAtGameTimeMs: number;
  endedAtGameTimeMs?: number;
  endReason?: RunEndReason;
};

export function createRunState(seed: string, startedAtGameTimeMs: number): RunState {
  return {
    seed,
    stageIndex: 0,
    waveIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    calorie: 0,
    caloriesDodged: 0,
    shotsFired: 0,
    shotsHit: 0,
    enemiesKilled: 0,
    bossesKilled: 0,
    startedAtGameTimeMs,
  };
}

export type RunReducerContext = {
  nowMs: number;
  comboWindowMs: number;
  comboState: ComboState;
};

export type RunReducerResult = {
  runState: RunState;
  comboState: ComboState;
};

/**
 * Applies one GameEvent to RunState + ComboState. Kept as the sole mutation
 * path so score/combo/calorie are never recomputed by display code
 * (FI-05 section 4, FI-03 section 10).
 */
export function applyGameEvent(
  runState: RunState,
  event: GameEvent,
  ctx: RunReducerContext,
): RunReducerResult {
  // FI-03 section 13: "CALORIE 100到達後は追加イベントを抑止し、RUN_ENDEDを一度だけ発行".
  // Once a run has ended, freeze all further stat mutation.
  if (runState.endReason) {
    return { runState, comboState: ctx.comboState };
  }

  switch (event.type) {
    case 'SHOT_FIRED':
      return {
        runState: { ...runState, shotsFired: runState.shotsFired + 1 },
        comboState: ctx.comboState,
      };

    case 'ENEMY_HIT':
      return {
        runState: { ...runState, shotsHit: runState.shotsHit + 1 },
        comboState: ctx.comboState,
      };

    case 'ENEMY_KILLED': {
      const nextCombo = registerKill(ctx.comboState, ctx.nowMs, ctx.comboWindowMs);
      const gained = killScore(event.score, nextCombo.combo);
      return {
        runState: {
          ...runState,
          score: runState.score + gained,
          combo: nextCombo.combo,
          maxCombo: nextCombo.maxCombo,
          enemiesKilled: runState.enemiesKilled + 1,
        },
        comboState: nextCombo,
      };
    }

    case 'PLAYER_HIT': {
      const nextCombo = registerHit(ctx.comboState);
      const calorie = applyCalorie(runState.calorie, event.calorie);
      const ended = isFatOver(calorie);
      return {
        runState: {
          ...runState,
          calorie,
          combo: 0,
          ...(ended
            ? { endedAtGameTimeMs: ctx.nowMs, endReason: 'FAT_OVER' as const }
            : {}),
        },
        comboState: nextCombo,
      };
    }

    case 'STAGE_CLEARED':
      return {
        runState: { ...runState, stageIndex: runState.stageIndex + 1 },
        comboState: ctx.comboState,
      };

    case 'RUN_ENDED': {
      return {
        runState: {
          ...runState,
          endedAtGameTimeMs: ctx.nowMs,
          endReason: event.reason,
        },
        comboState: ctx.comboState,
      };
    }

    default:
      return { runState, comboState: ctx.comboState };
  }
}

export function accuracy(runState: RunState): number {
  if (runState.shotsFired === 0) return 0;
  return runState.shotsHit / runState.shotsFired;
}

export function currentComboMultiplier(runState: RunState): number {
  return comboMultiplier(runState.combo);
}

export function freshComboState(): ComboState {
  return createComboState();
}
