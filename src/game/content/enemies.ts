import { GameBalance } from '../config/balance';
import type { PatternId } from './patterns';

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
  movementPattern: 'formation' | 'sine' | 'slowDrift' | 'telegraphCharge' | 'casterHold';
  firePattern: PatternId;
  dropEligible: boolean;
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
    movementPattern: 'formation',
    firePattern: 'fryStraight',
    dropEligible: true,
  },
  donutDrifter: {
    id: 'donutDrifter',
    maxHp: GameBalance.enemy.donutDrifter.maxHp,
    score: GameBalance.enemy.donutDrifter.score,
    fireRateMs: GameBalance.enemy.donutDrifter.fireRateMs,
    fireIntervalJitterMs: GameBalance.enemy.donutDrifter.fireIntervalJitterMs,
    bulletId: 'donut',
    contactCalorie: GameBalance.enemy.donutDrifter.contactCalorie,
    speedPxPerSec: GameBalance.enemy.donutDrifter.speedPxPerSec,
    spriteSize: GameBalance.enemy.donutDrifter.spriteSize,
    movementPattern: 'sine',
    firePattern: 'donutSine',
    dropEligible: true,
  },
  sodaTank: {
    id: 'sodaTank',
    maxHp: GameBalance.enemy.sodaTank.maxHp,
    score: GameBalance.enemy.sodaTank.score,
    fireRateMs: GameBalance.enemy.sodaTank.fireRateMs,
    fireIntervalJitterMs: GameBalance.enemy.sodaTank.fireIntervalJitterMs,
    bulletId: 'tapioca',
    contactCalorie: GameBalance.enemy.sodaTank.contactCalorie,
    speedPxPerSec: GameBalance.enemy.sodaTank.speedPxPerSec,
    spriteSize: GameBalance.enemy.sodaTank.spriteSize,
    movementPattern: 'slowDrift',
    firePattern: 'tapiocaSpread5',
    dropEligible: true,
  },
  pizzaCutter: {
    id: 'pizzaCutter',
    maxHp: GameBalance.enemy.pizzaCutter.maxHp,
    score: GameBalance.enemy.pizzaCutter.score,
    fireRateMs: GameBalance.enemy.pizzaCutter.fireRateMs,
    fireIntervalJitterMs: GameBalance.enemy.pizzaCutter.fireIntervalJitterMs,
    bulletId: 'pizzaSlice',
    contactCalorie: GameBalance.enemy.pizzaCutter.contactCalorie,
    speedPxPerSec: GameBalance.enemy.pizzaCutter.speedPxPerSec,
    spriteSize: GameBalance.enemy.pizzaCutter.spriteSize,
    movementPattern: 'telegraphCharge',
    firePattern: 'pizzaSliceTelegraph',
    dropEligible: true,
  },
  cakeCaster: {
    id: 'cakeCaster',
    maxHp: GameBalance.enemy.cakeCaster.maxHp,
    score: GameBalance.enemy.cakeCaster.score,
    fireRateMs: GameBalance.enemy.cakeCaster.fireRateMs,
    fireIntervalJitterMs: GameBalance.enemy.cakeCaster.fireIntervalJitterMs,
    bulletId: 'cake',
    contactCalorie: GameBalance.enemy.cakeCaster.contactCalorie,
    speedPxPerSec: GameBalance.enemy.cakeCaster.speedPxPerSec,
    spriteSize: GameBalance.enemy.cakeCaster.spriteSize,
    movementPattern: 'casterHold',
    firePattern: 'cakeLargeSlow',
    dropEligible: true,
  },
} as const satisfies Record<string, EnemyDefinition>;

export type EnemyId = keyof typeof enemies;
