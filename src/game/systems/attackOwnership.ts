import type { EnemyRuntimeData } from '../entities/Enemy';

/**
 * Delayed telegraph fire must bind to a specific enemy life instance, not merely
 * `sprite.active` (pooled sprites become active again after reuse).
 */
export function isEnemyTelegraphOwnerValid(
  sprite: { active: boolean; getData: (key: string) => unknown },
  expectedGeneration: number,
  phaseOk: boolean,
): boolean {
  if (!phaseOk || !sprite.active) return false;
  const runtime = sprite.getData('enemy') as EnemyRuntimeData | undefined;
  if (!runtime) return false;
  return runtime.spawnGeneration === expectedGeneration;
}

export function isBossTelegraphOwnerValid(
  currentBoss: { fightGeneration: number; sprite: { active: boolean } } | null,
  expectedFightGeneration: number,
  phaseOk: boolean,
): boolean {
  if (!phaseOk || !currentBoss) return false;
  if (!currentBoss.sprite.active) return false;
  return currentBoss.fightGeneration === expectedFightGeneration;
}
