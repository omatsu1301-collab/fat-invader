import { GameBalance } from '../config/balance';

export type BossDefinition = {
  id: string;
  maxHp: number;
  contactCalorie: number;
  spriteWidth: number;
  spriteHeight: number;
  introDurationMs: number;
  phase2HpFraction: number;
  phase1: { moveSpeedPxPerSec: number; fireIntervalMs: number; bulletCount: number };
  phase2: { moveSpeedPxPerSec: number; fireIntervalMs: number; bulletCount: number };
  deathDurationMs: number;
  bulletId: string;
};

/** FI-02 section 9.1 KING BURGER, simplified to 2 combat phases for Milestone A. */
export const bosses = {
  kingBurgerMini: {
    id: 'kingBurgerMini',
    maxHp: GameBalance.boss.kingBurgerMini.maxHp,
    contactCalorie: GameBalance.boss.kingBurgerMini.contactCalorie,
    spriteWidth: GameBalance.boss.kingBurgerMini.spriteWidth,
    spriteHeight: GameBalance.boss.kingBurgerMini.spriteHeight,
    introDurationMs: GameBalance.boss.kingBurgerMini.introDurationMs,
    phase2HpFraction: GameBalance.boss.kingBurgerMini.phase2HpFraction,
    phase1: GameBalance.boss.kingBurgerMini.phase1,
    phase2: GameBalance.boss.kingBurgerMini.phase2,
    deathDurationMs: GameBalance.boss.kingBurgerMini.deathDurationMs,
    bulletId: 'fry',
  },
} as const satisfies Record<string, BossDefinition>;

export type BossId = keyof typeof bosses;
