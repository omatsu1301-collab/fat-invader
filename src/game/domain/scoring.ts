import { comboMultiplier } from './combo';

/** FI-02 section 11.1 killScore = enemy.baseScore x comboMultiplier. */
export function killScore(baseScore: number, comboAtKill: number): number {
  return baseScore * comboMultiplier(comboAtKill);
}

export function stageClearBonus(stageNumber: number, bonusPerStage: number): number {
  return bonusPerStage * stageNumber;
}

export function bossNoHitBonus(stageNumber: number, bonusPerStage: number): number {
  return bonusPerStage * stageNumber;
}
