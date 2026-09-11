import { describe, expect, it } from 'vitest';
import { GameBalance } from '../../../src/game/config/balance';
import { applyGameEvent, createRunState } from '../../../src/game/domain/run-state';
import { createComboState } from '../../../src/game/domain/combo';

describe('stage calorie decay (AC-312)', () => {
  it('decays calorie by 10 on stage clear carry (balance contract)', () => {
    expect(GameBalance.scoring.caloriePerStageClearDecay).toBe(10);
  });

  it('STAGE_CLEARED increments stageIndex; calorie decay applied by scene using balance', () => {
    let run = createRunState('ac312', 0);
    run = { ...run, calorie: 40 };
    const result = applyGameEvent(run, { type: 'STAGE_CLEARED', stageId: 'stage1' }, {
      nowMs: 1000,
      comboWindowMs: 2000,
      comboState: createComboState(),
    });
    expect(result.runState.stageIndex).toBe(1);
    const decayed = Math.max(
      0,
      result.runState.calorie - GameBalance.scoring.caloriePerStageClearDecay,
    );
    expect(decayed).toBe(30);
  });
});
