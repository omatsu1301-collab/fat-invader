import { GameBalance } from '../config/balance';

/** FI-02 section 7.1 common enemy definition shape. */
export type EnemyDefinition = {
  id: string;
  maxHp: number;
  score: number;
  fireRateMs: number;
  fireIntervalJitterMs: number;
  bulletId: string;
  contactCalorie: number;
  speedPxPerSec: number;
  spriteSize: number;
};

export const enemies = {
  fryScout: {
    id: 'fryScout',
    maxHp: GameBalance.enemy.fryScout.maxHp,
    score: GameBalance.enemy.fryScout.score,
    fireRateMs: GameBalance.enemy.fryScout.fireRateMs,
    fireIntervalJitterMs: GameBalance.enemy.fryScout.fireIntervalJitterMs,
    bulletId: 'fry',
    contactCalorie: GameBalance.enemy.fryScout.contactCalorie,
    speedPxPerSec: GameBalance.enemy.fryScout.speedPxPerSec,
    spriteSize: GameBalance.enemy.fryScout.spriteSize,
  },
} as const satisfies Record<string, EnemyDefinition>;

export type EnemyId = keyof typeof enemies;
