import { GameBalance } from '../config/balance';

export type PowerUpId = 'protein' | 'caffeine' | 'cardio' | 'fatBurn' | 'cheatDay';

export type PowerUpDefinition = {
  id: PowerUpId;
  label: string;
  /** Short HUD / pickup label. */
  shortLabel: string;
  durationMs: number;
  /** CHEAT DAY only: CALORIE gained on pickup (must be readable before collect). */
  calorieCost: number;
  instant: boolean;
  textureKey: string;
};

export const powerups = {
  protein: {
    id: 'protein',
    label: 'PROTEIN',
    shortLabel: 'P',
    durationMs: GameBalance.powerup.protein.durationMs,
    calorieCost: 0,
    instant: false,
    textureKey: 'tex-pickup-protein',
  },
  caffeine: {
    id: 'caffeine',
    label: 'CAFFEINE',
    shortLabel: 'Caf',
    durationMs: GameBalance.powerup.caffeine.durationMs,
    calorieCost: 0,
    instant: false,
    textureKey: 'tex-pickup-caffeine',
  },
  cardio: {
    id: 'cardio',
    label: 'CARDIO',
    shortLabel: 'Car',
    durationMs: GameBalance.powerup.cardio.durationMs,
    calorieCost: 0,
    instant: false,
    textureKey: 'tex-pickup-cardio',
  },
  fatBurn: {
    id: 'fatBurn',
    label: 'FAT BURN',
    shortLabel: 'FB',
    durationMs: 0,
    calorieCost: 0,
    instant: true,
    textureKey: 'tex-pickup-fatburn',
  },
  cheatDay: {
    id: 'cheatDay',
    label: 'CHEAT DAY',
    shortLabel: `+${GameBalance.powerup.cheatDay.calorieCost}`,
    durationMs: GameBalance.powerup.cheatDay.durationMs,
    calorieCost: GameBalance.powerup.cheatDay.calorieCost,
    instant: false,
    textureKey: 'tex-pickup-cheatday',
  },
} as const satisfies Record<PowerUpId, PowerUpDefinition>;

export const POWERUP_IDS = Object.keys(powerups) as PowerUpId[];
