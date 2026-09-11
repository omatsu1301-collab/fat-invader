import { bullets } from './bullets';

/**
 * Attack pattern IDs for Full Graybox (AC-302).
 * Behaviors are composed in `systems/PatternSystem.ts` from shared primitives.
 */
export const PATTERN_IDS = [
  'fryStraight',
  'fry3Way',
  'fryAlternating',
  'donutSine',
  'pizzaSliceTelegraph',
  'pizzaSliceFan',
  'tapiocaSpread5',
  'cakeLargeSlow',
  'sodaLaser',
  'pizzaRadial8',
  'fryDonutComposite',
  'tapiocaLaserComposite',
  'kingCalorieFinale',
] as const;

export type PatternId = (typeof PATTERN_IDS)[number];

/** The 10 required visual/behavior combinations (AC-302). */
export const REQUIRED_ATTACK_COMBINATIONS: readonly PatternId[] = [
  'fryStraight',
  'fry3Way',
  'fryAlternating',
  'donutSine',
  'pizzaSliceTelegraph',
  'tapiocaSpread5',
  'cakeLargeSlow',
  'sodaLaser',
  'pizzaRadial8',
  'kingCalorieFinale',
] as const;

export function isPatternId(value: string): value is PatternId {
  return (PATTERN_IDS as readonly string[]).includes(value);
}

/** Minimum telegraph duration for fairness tests (AC-320). */
export function patternTelegraphMs(patternId: PatternId): number {
  switch (patternId) {
    case 'pizzaSliceTelegraph':
      return bullets.pizzaSlice.telegraphMs ?? 650;
    case 'cakeLargeSlow':
      return 650;
    case 'sodaLaser':
    case 'tapiocaLaserComposite':
      return bullets.sodaLaser.telegraphMs ?? 600;
    default:
      return 0;
  }
}
