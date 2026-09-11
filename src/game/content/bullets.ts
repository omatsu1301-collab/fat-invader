import { GameBalance } from '../config/balance';

export type BulletDefinition = {
  id: string;
  calorie: number;
  speedPxPerSec: number;
  /** Physics body size (hitbox). */
  size: number;
  visualSize: number;
  telegraphMs?: number;
  sineAmplitudePx?: number;
  sinePeriodMs?: number;
  spreadCount?: number;
  spreadDeg?: number;
  beamDurationMs?: number;
  beamHalfWidthPx?: number;
  beamSourceOffsetY?: number;
  beamReachY?: number;
  playerBandY?: number;
};

/** FI-02 section 8.2 food bullet baseline for Full Graybox. */
export const bullets = {
  fry: {
    id: 'fry',
    calorie: GameBalance.bullet.fry.calorie,
    speedPxPerSec: GameBalance.bullet.fry.speedPxPerSec,
    size: GameBalance.bullet.fry.size,
    visualSize: GameBalance.bullet.fry.visualSize,
  },
  donut: {
    id: 'donut',
    calorie: GameBalance.bullet.donut.calorie,
    speedPxPerSec: GameBalance.bullet.donut.speedPxPerSec,
    size: GameBalance.bullet.donut.size,
    visualSize: GameBalance.bullet.donut.visualSize,
    sineAmplitudePx: GameBalance.bullet.donut.sineAmplitudePx,
    sinePeriodMs: GameBalance.bullet.donut.sinePeriodMs,
  },
  pizzaSlice: {
    id: 'pizzaSlice',
    calorie: GameBalance.bullet.pizzaSlice.calorie,
    speedPxPerSec: GameBalance.bullet.pizzaSlice.speedPxPerSec,
    size: GameBalance.bullet.pizzaSlice.size,
    visualSize: GameBalance.bullet.pizzaSlice.visualSize,
    telegraphMs: GameBalance.bullet.pizzaSlice.telegraphMs,
  },
  tapioca: {
    id: 'tapioca',
    calorie: GameBalance.bullet.tapioca.calorie,
    speedPxPerSec: GameBalance.bullet.tapioca.speedPxPerSec,
    size: GameBalance.bullet.tapioca.size,
    visualSize: GameBalance.bullet.tapioca.visualSize,
    spreadCount: GameBalance.bullet.tapioca.spreadCount,
    spreadDeg: GameBalance.bullet.tapioca.spreadDeg,
  },
  cake: {
    id: 'cake',
    calorie: GameBalance.bullet.cake.calorie,
    speedPxPerSec: GameBalance.bullet.cake.speedPxPerSec,
    size: GameBalance.bullet.cake.size,
    visualSize: GameBalance.bullet.cake.visualSize,
  },
  sodaLaser: {
    id: 'sodaLaser',
    calorie: GameBalance.bullet.sodaLaser.calorie,
    speedPxPerSec: GameBalance.bullet.sodaLaser.speedPxPerSec,
    size: GameBalance.bullet.sodaLaser.size,
    visualSize: GameBalance.bullet.sodaLaser.visualSize,
    telegraphMs: GameBalance.bullet.sodaLaser.telegraphMs,
    beamDurationMs: GameBalance.bullet.sodaLaser.beamDurationMs,
    beamHalfWidthPx: GameBalance.bullet.sodaLaser.beamHalfWidthPx,
    beamSourceOffsetY: GameBalance.bullet.sodaLaser.beamSourceOffsetY,
    beamReachY: GameBalance.bullet.sodaLaser.beamReachY,
    playerBandY: GameBalance.bullet.sodaLaser.playerBandY,
  },
} as const satisfies Record<string, BulletDefinition>;

export type BulletId = keyof typeof bullets;
