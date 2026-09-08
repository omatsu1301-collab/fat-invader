import { clamp } from './calorie';

export type Rank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS';

export type EvaluationWeights = {
  clear: number;
  combat: number;
  avoidance: number;
  combo: number;
  accuracy: number;
};

export type EvaluationInput = {
  score: number;
  targetScore: number;
  finalCalorie: number;
  maxCombo: number;
  comboNormalizer: number;
  accuracy: number;
  accuracyNormalizer: number;
  weights: EvaluationWeights;
};

export type EvaluationResult = {
  evaluationScore: number;
  rank: Rank;
};

const RANK_THRESHOLDS: readonly { max: number; rank: Rank }[] = [
  { max: 34, rank: 'D' },
  { max: 49, rank: 'C' },
  { max: 64, rank: 'B' },
  { max: 79, rank: 'A' },
  { max: 94, rank: 'S' },
  { max: 100, rank: 'SS' },
];

/** FI-02 section 12 evaluationScore formula, evaluated only on RUN_ENDED CLEAR. */
export function evaluateRun(input: EvaluationInput): EvaluationResult {
  const clearComponent = input.weights.clear;
  const combatComponent =
    Math.min(input.score / input.targetScore, 1) * input.weights.combat;
  const avoidanceComponent = (1 - input.finalCalorie / 100) * input.weights.avoidance;
  const comboComponent =
    Math.min(input.maxCombo / input.comboNormalizer, 1) * input.weights.combo;
  const accuracyComponent =
    Math.min(input.accuracy / input.accuracyNormalizer, 1) * input.weights.accuracy;

  const evaluationScore = clamp(
    Math.round(
      clearComponent +
        combatComponent +
        avoidanceComponent +
        comboComponent +
        accuracyComponent,
    ),
    0,
    100,
  );

  return { evaluationScore, rank: rankForScore(evaluationScore) };
}

/** AC-315: boundaries 34/35, 49/50, 64/65, 79/80, 94/95 must land correctly. */
export function rankForScore(evaluationScore: number): Rank {
  for (const threshold of RANK_THRESHOLDS) {
    if (evaluationScore <= threshold.max) return threshold.rank;
  }
  return 'SS';
}
