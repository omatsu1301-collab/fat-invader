import { GameBalance } from '../config/balance';

export type BulletDefinition = {
  id: string;
  calorie: number;
  speedPxPerSec: number;
  size: number;
};

/** FI-02 section 8.2 bullet pattern baseline, narrowed to Milestone A's one food bullet. */
export const bullets = {
  fry: {
    id: 'fry',
    calorie: GameBalance.bullet.fry.calorie,
    speedPxPerSec: GameBalance.bullet.fry.speedPxPerSec,
    size: GameBalance.bullet.fry.size,
  },
} as const satisfies Record<string, BulletDefinition>;

export type BulletId = keyof typeof bullets;
