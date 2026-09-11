import type { BossId } from './bosses';
import type { WaveId } from './waves';

export type StageDefinition = {
  id: string;
  index: number;
  name: string;
  waveIds: WaveId[];
  bossId: BossId;
};

/** FI-02 section 10 — Full Graybox 3-stage run. */
export const stages = {
  stage1: {
    id: 'stage1',
    index: 0,
    name: 'BURGER DISTRICT',
    waveIds: ['stage1Wave1', 'stage1Wave2', 'stage1Wave3'],
    bossId: 'kingBurgerMini',
  },
  stage2: {
    id: 'stage2',
    index: 1,
    name: 'PIZZA ORBIT',
    waveIds: ['stage2Wave1', 'stage2Wave2', 'stage2Wave3'],
    bossId: 'pizzaMother',
  },
  stage3: {
    id: 'stage3',
    index: 2,
    name: 'BUFFET APOCALYPSE',
    waveIds: ['stage3Wave1', 'stage3Wave2', 'stage3Wave3'],
    bossId: 'kingCalorie',
  },
} as const satisfies Record<string, StageDefinition>;

export type StageId = keyof typeof stages;

export const STAGE_ORDER: StageId[] = ['stage1', 'stage2', 'stage3'];

export function stageByIndex(index: number): StageDefinition | undefined {
  const id = STAGE_ORDER[index];
  return id ? stages[id] : undefined;
}

export const TOTAL_STAGES = STAGE_ORDER.length;
