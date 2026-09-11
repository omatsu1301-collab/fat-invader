import { bosses } from './bosses';
import { bullets } from './bullets';
import { enemies } from './enemies';
import { PATTERN_IDS, REQUIRED_ATTACK_COMBINATIONS, type PatternId } from './patterns';
import { powerups, POWERUP_IDS } from './powerups';
import { STAGE_ORDER, stages } from './stages';
import { waves } from './waves';

export type ContentValidationResult = {
  ok: boolean;
  errors: string[];
};

/**
 * AC-306: every content id, pattern id, and cross-reference must validate.
 */
export function validateContentCatalog(): ContentValidationResult {
  const errors: string[] = [];

  for (const id of PATTERN_IDS) {
    if (!id) errors.push('empty pattern id');
  }

  for (const required of REQUIRED_ATTACK_COMBINATIONS) {
    if (!PATTERN_IDS.includes(required)) {
      errors.push(`required attack combination missing: ${required}`);
    }
  }

  for (const [enemyId, def] of Object.entries(enemies)) {
    if (def.id !== enemyId) errors.push(`enemy id mismatch: ${enemyId}`);
    if (!(def.bulletId in bullets)) errors.push(`enemy ${enemyId} unknown bullet ${def.bulletId}`);
    if (!PATTERN_IDS.includes(def.firePattern as PatternId)) {
      errors.push(`enemy ${enemyId} unknown firePattern ${def.firePattern}`);
    }
  }

  for (const [bulletId, def] of Object.entries(bullets)) {
    if (def.id !== bulletId) errors.push(`bullet id mismatch: ${bulletId}`);
  }

  for (const [bossId, def] of Object.entries(bosses)) {
    if (def.id !== bossId) errors.push(`boss id mismatch: ${bossId}`);
    if (!(def.bulletId in bullets)) errors.push(`boss ${bossId} unknown bullet ${def.bulletId}`);
    for (const phase of [def.phase1, def.phase2, def.rage] as const) {
      if (!PATTERN_IDS.includes(phase.patternId as PatternId)) {
        errors.push(`boss ${bossId} unknown pattern ${phase.patternId}`);
      }
    }
  }

  for (const id of POWERUP_IDS) {
    if (powerups[id].id !== id) errors.push(`powerup id mismatch: ${id}`);
  }

  if (STAGE_ORDER.length !== 3) errors.push('expected exactly 3 stages');

  for (const stageId of STAGE_ORDER) {
    const stage = stages[stageId];
    if (!(stage.bossId in bosses)) errors.push(`stage ${stageId} unknown boss ${stage.bossId}`);
    for (const waveId of stage.waveIds) {
      if (!(waveId in waves)) errors.push(`stage ${stageId} unknown wave ${waveId}`);
      else if (waves[waveId].stageId !== stageId) {
        errors.push(`wave ${waveId} stageId mismatch`);
      }
    }
  }

  for (const [waveId, wave] of Object.entries(waves)) {
    if (wave.id !== waveId) errors.push(`wave id mismatch: ${waveId}`);
    for (const spawn of wave.spawns) {
      if (!(spawn.enemyId in enemies)) errors.push(`wave ${waveId} unknown enemy ${spawn.enemyId}`);
      if (spawn.firePatternOverride && !PATTERN_IDS.includes(spawn.firePatternOverride)) {
        errors.push(`wave ${waveId} unknown override ${spawn.firePatternOverride}`);
      }
    }
  }

  const enemyCount = Object.keys(enemies).length;
  if (enemyCount < 5) errors.push(`expected >=5 enemies, got ${enemyCount}`);

  const bossCount = Object.keys(bosses).length;
  if (bossCount < 3) errors.push(`expected >=3 bosses, got ${bossCount}`);

  if (POWERUP_IDS.length < 5) errors.push(`expected >=5 powerups, got ${POWERUP_IDS.length}`);
  if (REQUIRED_ATTACK_COMBINATIONS.length < 10) {
    errors.push(`expected >=10 attack combinations, got ${REQUIRED_ATTACK_COMBINATIONS.length}`);
  }

  return { ok: errors.length === 0, errors };
}
