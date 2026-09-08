import { GameBalance } from '../config/balance';
import type { EnemyId } from './enemies';

export type SpawnCommand = {
  atMs: number;
  enemyId: EnemyId;
  gridX: number;
  gridY: number;
};

export type WaveDefinition = {
  id: string;
  stageId: string;
  spawns: SpawnCommand[];
  completion: 'ALL_DEFEATED';
};

function buildStage1Formation(): SpawnCommand[] {
  const { formationRows, formationCols, spawnStaggerMs } = GameBalance.wave.stage1;
  const spawns: SpawnCommand[] = [];
  let index = 0;
  for (let row = 0; row < formationRows; row += 1) {
    for (let col = 0; col < formationCols; col += 1) {
      spawns.push({
        atMs: index * spawnStaggerMs,
        enemyId: 'fryScout',
        gridX: col,
        gridY: row,
      });
      index += 1;
    }
  }
  return spawns;
}

/** FI-02 section 10 Stage 1, wave 1: a single FRY SCOUT formation (Milestone A scope). */
export const waves = {
  stage1Wave1: {
    id: 'stage1Wave1',
    stageId: 'stage1',
    spawns: buildStage1Formation(),
    completion: 'ALL_DEFEATED',
  },
} as const satisfies Record<string, WaveDefinition>;

export type WaveId = keyof typeof waves;
