import { GameBalance } from '../config/balance';
import type { EnemyId } from './enemies';
import type { PatternId } from './patterns';

export type SpawnCommand = {
  atMs: number;
  enemyId: EnemyId;
  gridX: number;
  gridY: number;
  /** Optional fire-pattern override for attack-combination coverage. */
  firePatternOverride?: PatternId;
};

export type WaveDefinition = {
  id: string;
  stageId: string;
  spawns: SpawnCommand[];
  completion: 'ALL_DEFEATED';
};

function gridSpawns(
  enemyId: EnemyId,
  rows: number,
  cols: number,
  staggerMs: number,
  firePatternOverride?: PatternId,
): SpawnCommand[] {
  const spawns: SpawnCommand[] = [];
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      spawns.push({
        atMs: index * staggerMs,
        enemyId,
        gridX: col,
        gridY: row,
        ...(firePatternOverride ? { firePatternOverride } : {}),
      });
      index += 1;
    }
  }
  return spawns;
}

function listSpawns(
  entries: Array<{ enemyId: EnemyId; gridX: number; gridY: number; firePatternOverride?: PatternId }>,
  staggerMs: number,
): SpawnCommand[] {
  return entries.map((entry, index) => ({
    atMs: index * staggerMs,
    ...entry,
  }));
}

const stagger = GameBalance.wave.stage1.spawnStaggerMs;

/** Compact Full Graybox waves — all 5 enemies + 10 attack combos reachable. */
export const waves = {
  stage1Wave1: {
    id: 'stage1Wave1',
    stageId: 'stage1',
    spawns: gridSpawns('fryScout', 2, 3, stagger),
    completion: 'ALL_DEFEATED',
  },
  stage1Wave2: {
    id: 'stage1Wave2',
    stageId: 'stage1',
    spawns: listSpawns(
      [
        { enemyId: 'fryScout', gridX: 0, gridY: 0, firePatternOverride: 'fry3Way' },
        { enemyId: 'fryScout', gridX: 2, gridY: 0, firePatternOverride: 'fryAlternating' },
        { enemyId: 'donutDrifter', gridX: 1, gridY: 1 },
        { enemyId: 'donutDrifter', gridX: 3, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage1Wave3: {
    id: 'stage1Wave3',
    stageId: 'stage1',
    spawns: listSpawns(
      [
        { enemyId: 'sodaTank', gridX: 1, gridY: 0 },
        { enemyId: 'sodaTank', gridX: 2, gridY: 0 },
        { enemyId: 'fryScout', gridX: 0, gridY: 1 },
        { enemyId: 'fryScout', gridX: 3, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage2Wave1: {
    id: 'stage2Wave1',
    stageId: 'stage2',
    spawns: listSpawns(
      [
        { enemyId: 'donutDrifter', gridX: 0, gridY: 0 },
        { enemyId: 'donutDrifter', gridX: 2, gridY: 0 },
        { enemyId: 'donutDrifter', gridX: 1, gridY: 1 },
        { enemyId: 'donutDrifter', gridX: 3, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage2Wave2: {
    id: 'stage2Wave2',
    stageId: 'stage2',
    spawns: listSpawns(
      [
        { enemyId: 'pizzaCutter', gridX: 0, gridY: 0 },
        { enemyId: 'pizzaCutter', gridX: 3, gridY: 0 },
        { enemyId: 'fryScout', gridX: 1, gridY: 1, firePatternOverride: 'fryStraight' },
        { enemyId: 'fryScout', gridX: 2, gridY: 1, firePatternOverride: 'fry3Way' },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage2Wave3: {
    id: 'stage2Wave3',
    stageId: 'stage2',
    spawns: listSpawns(
      [
        { enemyId: 'sodaTank', gridX: 1, gridY: 0 },
        { enemyId: 'pizzaCutter', gridX: 0, gridY: 1 },
        { enemyId: 'pizzaCutter', gridX: 3, gridY: 1 },
        { enemyId: 'donutDrifter', gridX: 2, gridY: 0 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage3Wave1: {
    id: 'stage3Wave1',
    stageId: 'stage3',
    spawns: listSpawns(
      [
        { enemyId: 'cakeCaster', gridX: 1, gridY: 0 },
        { enemyId: 'cakeCaster', gridX: 2, gridY: 0 },
        { enemyId: 'fryScout', gridX: 0, gridY: 1 },
        { enemyId: 'fryScout', gridX: 3, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage3Wave2: {
    id: 'stage3Wave2',
    stageId: 'stage3',
    spawns: listSpawns(
      [
        { enemyId: 'sodaTank', gridX: 0, gridY: 0, firePatternOverride: 'sodaLaser' },
        { enemyId: 'cakeCaster', gridX: 2, gridY: 0 },
        { enemyId: 'donutDrifter', gridX: 1, gridY: 1 },
        { enemyId: 'pizzaCutter', gridX: 3, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
  stage3Wave3: {
    id: 'stage3Wave3',
    stageId: 'stage3',
    spawns: listSpawns(
      [
        { enemyId: 'fryScout', gridX: 0, gridY: 0, firePatternOverride: 'fryAlternating' },
        { enemyId: 'donutDrifter', gridX: 1, gridY: 0 },
        { enemyId: 'sodaTank', gridX: 2, gridY: 0 },
        { enemyId: 'pizzaCutter', gridX: 3, gridY: 0 },
        { enemyId: 'cakeCaster', gridX: 1, gridY: 1 },
        { enemyId: 'cakeCaster', gridX: 2, gridY: 1 },
      ],
      stagger,
    ),
    completion: 'ALL_DEFEATED',
  },
} as const satisfies Record<string, WaveDefinition>;

export type WaveId = keyof typeof waves;
