import { describe, expect, it } from 'vitest';
import { evaluateRun, rankForScore } from '../../../src/game/domain/evaluation';
import { GameBalance } from '../../../src/game/config/balance';

describe('evaluation', () => {
  it('places ranks at the exact FI-02 boundaries (AC-315)', () => {
    expect(rankForScore(34)).toBe('D');
    expect(rankForScore(35)).toBe('C');
    expect(rankForScore(49)).toBe('C');
    expect(rankForScore(50)).toBe('B');
    expect(rankForScore(64)).toBe('B');
    expect(rankForScore(65)).toBe('A');
    expect(rankForScore(79)).toBe('A');
    expect(rankForScore(80)).toBe('S');
    expect(rankForScore(94)).toBe('S');
    expect(rankForScore(95)).toBe('SS');
    expect(rankForScore(100)).toBe('SS');
  });

  it('computes a perfect run as SS', () => {
    const result = evaluateRun({
      score: GameBalance.evaluation.targetScore,
      targetScore: GameBalance.evaluation.targetScore,
      finalCalorie: 0,
      maxCombo: GameBalance.evaluation.comboNormalizer,
      comboNormalizer: GameBalance.evaluation.comboNormalizer,
      accuracy: GameBalance.evaluation.accuracyNormalizer,
      accuracyNormalizer: GameBalance.evaluation.accuracyNormalizer,
      weights: GameBalance.evaluation.weights,
    });
    expect(result.evaluationScore).toBe(100);
    expect(result.rank).toBe('SS');
  });

  it('a bare clear with no combat still scores exactly the clear weight', () => {
    const result = evaluateRun({
      score: 0,
      targetScore: GameBalance.evaluation.targetScore,
      finalCalorie: 100,
      maxCombo: 0,
      comboNormalizer: GameBalance.evaluation.comboNormalizer,
      accuracy: 0,
      accuracyNormalizer: GameBalance.evaluation.accuracyNormalizer,
      weights: GameBalance.evaluation.weights,
    });
    expect(result.evaluationScore).toBe(GameBalance.evaluation.weights.clear);
    expect(result.rank).toBe(rankForScore(GameBalance.evaluation.weights.clear));
  });
});
