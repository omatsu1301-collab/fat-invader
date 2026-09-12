import { GameBalance } from '../config/balance';
import type { PatternId } from './patterns';

export type BossPhaseCombatConfig = {
  moveSpeedPxPerSec: number;
  fireIntervalMs: number;
  bulletCount: number;
  patternId: PatternId;
};

export type BossDefinition = {
  id: string;
  maxHp: number;
  contactCalorie: number;
  spriteWidth: number;
  spriteHeight: number;
  introDurationMs: number;
  phase2HpFraction: number;
  rageHpFraction: number;
  phase1: BossPhaseCombatConfig;
  phase2: BossPhaseCombatConfig;
  rage: BossPhaseCombatConfig;
  deathDurationMs: number;
  bulletId: string;
  displayName: string;
};

/** FI-02 section 9: full intro → phase1 → phase2 → rage → dead. */
export const bosses = {
  kingBurgerMini: {
    id: 'kingBurgerMini',
    maxHp: GameBalance.boss.kingBurgerMini.maxHp,
    contactCalorie: GameBalance.boss.kingBurgerMini.contactCalorie,
    spriteWidth: GameBalance.boss.kingBurgerMini.spriteWidth,
    spriteHeight: GameBalance.boss.kingBurgerMini.spriteHeight,
    introDurationMs: GameBalance.boss.kingBurgerMini.introDurationMs,
    phase2HpFraction: GameBalance.boss.kingBurgerMini.phase2HpFraction,
    rageHpFraction: GameBalance.boss.kingBurgerMini.rageHpFraction,
    phase1: GameBalance.boss.kingBurgerMini.phase1,
    phase2: GameBalance.boss.kingBurgerMini.phase2,
    rage: GameBalance.boss.kingBurgerMini.rage,
    deathDurationMs: GameBalance.boss.kingBurgerMini.deathDurationMs,
    bulletId: 'fry',
    displayName: 'KING BURGER',
  },
  pizzaMother: {
    id: 'pizzaMother',
    maxHp: GameBalance.boss.pizzaMother.maxHp,
    contactCalorie: GameBalance.boss.pizzaMother.contactCalorie,
    spriteWidth: GameBalance.boss.pizzaMother.spriteWidth,
    spriteHeight: GameBalance.boss.pizzaMother.spriteHeight,
    introDurationMs: GameBalance.boss.pizzaMother.introDurationMs,
    phase2HpFraction: GameBalance.boss.pizzaMother.phase2HpFraction,
    rageHpFraction: GameBalance.boss.pizzaMother.rageHpFraction,
    phase1: GameBalance.boss.pizzaMother.phase1,
    phase2: GameBalance.boss.pizzaMother.phase2,
    rage: GameBalance.boss.pizzaMother.rage,
    deathDurationMs: GameBalance.boss.pizzaMother.deathDurationMs,
    bulletId: 'pizzaSlice',
    displayName: 'PIZZA MOTHER',
  },
  kingCalorie: {
    id: 'kingCalorie',
    maxHp: GameBalance.boss.kingCalorie.maxHp,
    contactCalorie: GameBalance.boss.kingCalorie.contactCalorie,
    spriteWidth: GameBalance.boss.kingCalorie.spriteWidth,
    spriteHeight: GameBalance.boss.kingCalorie.spriteHeight,
    introDurationMs: GameBalance.boss.kingCalorie.introDurationMs,
    phase2HpFraction: GameBalance.boss.kingCalorie.phase2HpFraction,
    rageHpFraction: GameBalance.boss.kingCalorie.rageHpFraction,
    phase1: GameBalance.boss.kingCalorie.phase1,
    phase2: GameBalance.boss.kingCalorie.phase2,
    rage: GameBalance.boss.kingCalorie.rage,
    deathDurationMs: GameBalance.boss.kingCalorie.deathDurationMs,
    bulletId: 'fry',
    displayName: 'KING CALORIE',
  },
} as const satisfies Record<string, BossDefinition>;

export type BossId = keyof typeof bosses;
