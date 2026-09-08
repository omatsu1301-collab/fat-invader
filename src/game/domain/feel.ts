import { GameBalance } from '../config/balance';
import { comboCallout } from './combo';

export type ScreenShakeMode = 'full' | 'reduced' | 'off';

export type FeelSettings = {
  reducedEffects: boolean;
  screenShake: ScreenShakeMode;
};

export const DEFAULT_FEEL_SETTINGS: FeelSettings = {
  reducedEffects: false,
  screenShake: 'full',
};

/** Decorative spawn that may be dropped at cap; never used for gameplay projectiles. */
export function allocateDecorativeCount(requested: number, active: number, cap: number): number {
  if (requested <= 0 || active >= cap) return 0;
  return Math.min(requested, cap - active);
}

export function killParticleCount(settings: FeelSettings): number {
  return settings.reducedEffects
    ? GameBalance.feel.killParticlesReduced
    : GameBalance.feel.killParticles;
}

export function muzzleParticleCount(settings: FeelSettings): number {
  return settings.reducedEffects
    ? GameBalance.feel.muzzleParticlesReduced
    : GameBalance.feel.muzzleParticles;
}

export function killFragmentCount(settings: FeelSettings, rollInclusive: number): number {
  if (settings.reducedEffects) {
    return GameBalance.feel.killFragmentsMin;
  }
  const min = GameBalance.feel.killFragmentsMin;
  const max = GameBalance.feel.killFragmentsMax;
  const span = max - min;
  const clamped = Math.max(0, Math.min(1, rollInclusive));
  return min + Math.round(span * clamped);
}

export function flashAlpha(settings: FeelSettings): number {
  return settings.reducedEffects ? GameBalance.feel.flashAlphaReduced : GameBalance.feel.flashAlpha;
}

/**
 * FI-04 §8.3: simultaneous shakes are clamped to the stronger request, never
 * summed. Shake Off is 0. Reduced Effects or shake=reduced uses 25%.
 */
export function scaledShakePx(settings: FeelSettings, requestedPx: number): number {
  if (settings.screenShake === 'off' || requestedPx <= 0) return 0;
  const reduced = settings.screenShake === 'reduced' || settings.reducedEffects;
  const scale = reduced ? GameBalance.feel.shake.reducedScale : 1;
  return requestedPx * scale;
}

export function stackShakePx(currentPx: number, incomingPx: number): number {
  return Math.max(currentPx, incomingPx);
}

/** Consecutive hit-stops take the stronger remaining time, then clamp. */
export function stackHitStopMs(
  currentRemainingMs: number,
  requestedMs: number,
  capMs: number = GameBalance.hitStop.frameStopUpperBoundMs,
): number {
  return Math.min(capMs, Math.max(currentRemainingMs, requestedMs));
}

export function comboTierCalloutAt(combo: number): string | null {
  const callout = comboCallout(combo);
  if (!callout) return null;
  const isExactTier = combo === 5 || combo === 10 || combo === 25 || combo === 50;
  return isExactTier ? callout : null;
}

export function comboShakeBonusPx(combo: number): number {
  if (combo >= 50 || combo >= 25) return GameBalance.feel.shake.comboTierBonusPx;
  return 0;
}
