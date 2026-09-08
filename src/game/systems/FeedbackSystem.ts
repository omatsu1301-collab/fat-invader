import Phaser from 'phaser';
import { GameBalance } from '../config/balance';
import { DisplayDepth } from '../config/display';
import {
  allocateDecorativeCount,
  comboShakeBonusPx,
  comboTierCalloutAt,
  flashAlpha,
  killFragmentCount,
  killParticleCount,
  muzzleParticleCount,
  scaledShakePx,
  stackHitStopMs,
  stackShakePx,
  type FeelSettings,
} from '../domain/feel';
import type { GameEvent } from '../domain/events';
import { killScore } from '../domain/scoring';
import type { RandomSource } from '../ports/Random';
import { TextureKey } from '../entities/textures';

const COLOR_POPUP = '#FFF0D2';
const COLOR_CALLOUT = '#B9FF4A';
const PARTICLE_TINTS = [0xffb33d, 0xff4f64, 0xff71c8, 0xb9ff4a];

type ParticleSlot = {
  sprite: Phaser.GameObjects.Image;
  live: boolean;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
};

type PopupSlot = {
  text: Phaser.GameObjects.Text;
  live: boolean;
  lifeMs: number;
  maxLifeMs: number;
};

type FlashSlot = { rect: Phaser.GameObjects.Rectangle; lifeMs: number };
type BurstCue = { atMs: number; x: number; y: number };
type ShockwaveSlot = { arc: Phaser.GameObjects.Arc; lifeMs: number; maxLifeMs: number };

export type FeelTelemetry = {
  activeParticles: number;
  activeFragments: number;
  activeScorePopups: number;
  shakePx: number;
  hitStopRemainingMs: number;
};

/**
 * Display-only Game Feel. Subscribes to GameEvents and never writes RunState,
 * HP, CALORIE, or stage phase (FI-05 §4). Projectile groups are not touched.
 */
export class FeedbackSystem {
  private hitStopRemainingMs = 0;
  private shakePx = 0;
  private shakeRemainingMs = 0;
  private readonly particles: ParticleSlot[] = [];
  private readonly fragments: ParticleSlot[] = [];
  private readonly popups: PopupSlot[] = [];
  private readonly flashes: FlashSlot[] = [];
  private readonly burstCues: BurstCue[] = [];
  private readonly shockwaves: ShockwaveSlot[] = [];
  private callout: Phaser.GameObjects.Text;
  private calloutUntilMs = 0;
  private vignette: Phaser.GameObjects.Rectangle;
  private vignetteUntilMs = 0;
  private displayClockMs = 0;
  private shakeApplied = false;
  private unsub: (() => void) | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private settings: FeelSettings,
    private readonly random: RandomSource,
    onEvent: { on: (listener: (event: GameEvent) => void) => () => void },
    private readonly playerXY: () => { x: number; y: number },
    private readonly bossXY: () => { x: number; y: number } | null,
  ) {
    this.callout = scene.add
      .text(scene.scale.width / 2, 36, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: COLOR_CALLOUT,
        stroke: '#090615',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0)
      .setDepth(DisplayDepth.callout)
      .setScrollFactor(0)
      .setVisible(false);

    this.vignette = scene.add
      .rectangle(0, 0, scene.scale.width, scene.scale.height, 0xff4f64, 0)
      .setOrigin(0, 0)
      .setDepth(DisplayDepth.popup)
      .setScrollFactor(0);

    this.unsub = onEvent.on((event) => this.handle(event));
  }

  setSettings(settings: FeelSettings): void {
    this.settings = settings;
  }

  isHitStopped(): boolean {
    return this.hitStopRemainingMs > 0;
  }

  clearHitStop(): void {
    this.hitStopRemainingMs = 0;
  }

  telemetry(): FeelTelemetry {
    return {
      activeParticles: countLive(this.particles),
      activeFragments: countLive(this.fragments),
      activeScorePopups: countLive(this.popups),
      shakePx: this.shakeRemainingMs > 0 ? this.shakePx : 0,
      hitStopRemainingMs: this.hitStopRemainingMs,
    };
  }

  tick(dtMs: number, isDisplayRunning: boolean): void {
    if (!isDisplayRunning) {
      return;
    }

    this.displayClockMs += dtMs;
    if (this.hitStopRemainingMs > 0) {
      this.hitStopRemainingMs = Math.max(0, this.hitStopRemainingMs - dtMs);
    }

    this.stepSlots(this.particles, dtMs, 0);
    this.stepSlots(this.fragments, dtMs, 420);
    this.stepPopups(dtMs);
    this.stepFlashes(dtMs);
    this.stepBursts();
    this.stepShockwaves(dtMs);
    this.stepShake(dtMs);
    this.stepCallout();
    this.stepVignette();
  }

  playBossDeath(x: number, y: number): void {
    this.requestHitStop(GameBalance.hitStop.bossKillMs);
    this.requestShake(GameBalance.feel.shake.bossDeathPx, GameBalance.feel.shake.bossDeathMs);
    const bursts = this.settings.reducedEffects
      ? Math.max(3, Math.floor(GameBalance.feel.bossDeathBurstCount / 2))
      : GameBalance.feel.bossDeathBurstCount;
    for (let i = 0; i < bursts; i += 1) {
      const angle = (i / bursts) * Math.PI * 2;
      const radius = 28 + i * 6;
      this.burstCues.push({
        atMs: this.displayClockMs + i * 70,
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
      });
    }
    const waves = this.settings.reducedEffects ? 1 : GameBalance.feel.bossDeathShockwaves;
    for (let i = 0; i < waves; i += 1) {
      this.spawnShockwave(x, y, 40 + i * 18);
    }
  }

  spawnSpark(x: number, y: number): void {
    this.activateParticle(this.particles, GameBalance.pools.particle, x, y, 0xfff0d2, 40, 80, 180);
  }

  destroy(): void {
    this.unsub?.();
    this.unsub = null;
    if (this.scene.sys.isActive() && this.scene.cameras.main) {
      this.scene.cameras.main.scrollX = 0;
      this.scene.cameras.main.scrollY = 0;
    }
  }

  private handle(event: GameEvent): void {
    switch (event.type) {
      case 'SHOT_FIRED': {
        const pos = this.playerXY();
        this.playMuzzle(pos.x, pos.y - 18);
        break;
      }
      case 'ENEMY_HIT':
        this.spawnFlash(event.x, event.y, 14);
        break;
      case 'ENEMY_KILLED':
        this.playKill(event.x, event.y, event.score, event.combo);
        break;
      case 'PLAYER_HIT':
        this.playPlayerHit(event.total >= 100);
        break;
      case 'BOSS_PHASE_CHANGED':
        this.requestShake(GameBalance.feel.shake.bossPhasePx, GameBalance.feel.shake.bossPhaseMs);
        this.spawnFlash(this.scene.scale.width / 2, 130, 28);
        break;
      case 'BOSS_DEFEATED': {
        const boss = this.bossXY();
        this.playBossDeath(boss?.x ?? this.scene.scale.width / 2, boss?.y ?? 130);
        break;
      }
      case 'COMBO_TIER_CHANGED': {
        const callout = comboTierCalloutAt(event.combo) ?? comboFallbackCallout(event.combo);
        if (callout) this.showCallout(callout);
        break;
      }
      default:
        break;
    }
  }

  private playMuzzle(x: number, y: number): void {
    const n = muzzleParticleCount(this.settings);
    for (let i = 0; i < n; i += 1) {
      this.activateParticle(
        this.particles,
        GameBalance.pools.particle,
        x,
        y,
        0x53f6ff,
        -40 + this.random.next() * 80,
        -180 - this.random.next() * 80,
        120,
      );
    }
  }

  private playKill(x: number, y: number, baseScore: number, combo: number): void {
    this.requestHitStop(GameBalance.hitStop.normalKillMs);
    const shake =
      GameBalance.feel.shake.normalKillPx + comboShakeBonusPx(combo);
    this.requestShake(shake, GameBalance.feel.shake.normalKillMs);
    this.spawnFlash(x, y, 16);
    this.spawnKillBurst(x, y);
    this.spawnPopup(x, y, `+${killScore(baseScore, combo)}`);
    const callout = comboTierCalloutAt(combo);
    if (callout) this.showCallout(callout);
  }

  private spawnKillBurst(x: number, y: number): void {
    const particleN = killParticleCount(this.settings);
    for (let i = 0; i < particleN; i += 1) {
      const angle = this.random.next() * Math.PI * 2;
      const speed = 80 + this.random.next() * 160;
      const tint = PARTICLE_TINTS[this.random.nextInt(0, PARTICLE_TINTS.length - 1)] ?? 0xffb33d;
      this.activateParticle(
        this.particles,
        GameBalance.pools.particle,
        x,
        y,
        tint,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        GameBalance.feel.particleLifetimeMs,
      );
    }
    const fragments = killFragmentCount(this.settings, this.random.next());
    for (let i = 0; i < fragments; i += 1) {
      const angle = this.random.next() * Math.PI * 2;
      const speed = 60 + this.random.next() * 90;
      this.activateParticle(
        this.fragments,
        GameBalance.pools.fragment,
        x,
        y,
        0xffb33d,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 40,
        GameBalance.feel.fragmentLifetimeMs,
        TextureKey.fragment,
      );
    }
  }

  private playPlayerHit(isFatOver: boolean): void {
    this.requestHitStop(GameBalance.hitStop.playerHitMs);
    this.requestShake(GameBalance.feel.shake.playerHitPx, GameBalance.feel.shake.playerHitMs);
    const alpha = flashAlpha(this.settings) * (isFatOver ? 0.45 : 0.22);
    this.vignette.setFillStyle(0xff4f64, alpha);
    this.vignetteUntilMs = this.displayClockMs + GameBalance.feel.playerHitVignetteMs;
    const pos = this.playerXY();
    this.spawnFlash(pos.x, pos.y, isFatOver ? 22 : 16);
  }

  private showCallout(text: string): void {
    this.callout.setText(text).setVisible(true).setAlpha(1);
    this.calloutUntilMs = this.displayClockMs + GameBalance.feel.comboCalloutDurationMs;
  }

  private requestHitStop(ms: number): void {
    this.hitStopRemainingMs = stackHitStopMs(this.hitStopRemainingMs, ms);
  }

  private requestShake(px: number, ms: number): void {
    const scaled = scaledShakePx(this.settings, px);
    this.shakePx = stackShakePx(this.shakePx, scaled);
    if (scaled > 0) {
      this.shakeRemainingMs = Math.max(this.shakeRemainingMs, ms);
    }
  }

  private spawnFlash(x: number, y: number, size: number): void {
    const rect = this.scene.add
      .rectangle(x, y, size, size, 0xffffff, flashAlpha(this.settings))
      .setDepth(DisplayDepth.vfx);
    this.flashes.push({ rect, lifeMs: GameBalance.feel.flashDurationMs });
  }

  private spawnShockwave(x: number, y: number, startRadius: number): void {
    const alpha = this.settings.reducedEffects ? 0.25 : 0.55;
    const arc = this.scene.add
      .circle(x, y, startRadius, 0xfff0d2, 0)
      .setStrokeStyle(2, 0xfff0d2, alpha)
      .setDepth(DisplayDepth.vfx);
    this.shockwaves.push({ arc, lifeMs: 320, maxLifeMs: 320 });
  }

  private spawnPopup(x: number, y: number, label: string): void {
    const granted = allocateDecorativeCount(
      1,
      countLive(this.popups),
      GameBalance.pools.scorePopup,
    );
    if (granted <= 0) return;
    let slot = this.popups.find((p) => !p.live);
    if (!slot) {
      const text = this.scene.add
        .text(x, y, label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: COLOR_POPUP,
          stroke: '#090615',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(DisplayDepth.popup);
      slot = {
        text,
        live: false,
        lifeMs: 0,
        maxLifeMs: GameBalance.feel.scorePopupLifetimeMs,
      };
      this.popups.push(slot);
    }
    slot.live = true;
    slot.lifeMs = GameBalance.feel.scorePopupLifetimeMs;
    slot.maxLifeMs = GameBalance.feel.scorePopupLifetimeMs;
    slot.text.setText(label).setPosition(x, y).setVisible(true).setAlpha(1);
  }

  private activateParticle(
    pool: ParticleSlot[],
    cap: number,
    x: number,
    y: number,
    tint: number,
    vx: number,
    vy: number,
    lifeMs: number,
    texture: string = TextureKey.particle,
  ): void {
    const granted = allocateDecorativeCount(1, countLive(pool), cap);
    if (granted <= 0) return;
    let slot = pool.find((p) => !p.live);
    if (!slot) {
      const sprite = this.scene.add.image(x, y, texture).setDepth(DisplayDepth.vfx);
      slot = { sprite, live: false, vx: 0, vy: 0, lifeMs: 0, maxLifeMs: lifeMs };
      pool.push(slot);
    }
    slot.live = true;
    slot.vx = vx;
    slot.vy = vy;
    slot.lifeMs = lifeMs;
    slot.maxLifeMs = lifeMs;
    slot.sprite.setTexture(texture).setTint(tint).setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
  }

  private stepSlots(pool: ParticleSlot[], dtMs: number, gravity: number): void {
    const dt = dtMs / 1000;
    for (const slot of pool) {
      if (!slot.live) continue;
      slot.lifeMs -= dtMs;
      slot.vy += gravity * dt;
      slot.sprite.x += slot.vx * dt;
      slot.sprite.y += slot.vy * dt;
      const t = Math.max(0, slot.lifeMs / slot.maxLifeMs);
      slot.sprite.setAlpha(t);
      if (slot.lifeMs <= 0) {
        slot.live = false;
        slot.sprite.setVisible(false);
      }
    }
  }

  private stepPopups(dtMs: number): void {
    const rise = (GameBalance.feel.scorePopupRisePxPerSec * dtMs) / 1000;
    for (const slot of this.popups) {
      if (!slot.live) continue;
      slot.lifeMs -= dtMs;
      slot.text.y -= rise;
      slot.text.setAlpha(Math.max(0, slot.lifeMs / slot.maxLifeMs));
      if (slot.lifeMs <= 0) {
        slot.live = false;
        slot.text.setVisible(false);
      }
    }
  }

  private stepFlashes(dtMs: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i -= 1) {
      const slot = this.flashes[i];
      if (!slot) continue;
      slot.lifeMs -= dtMs;
      if (slot.lifeMs <= 0) {
        slot.rect.destroy();
        this.flashes.splice(i, 1);
      }
    }
  }

  private stepBursts(): void {
    const due: BurstCue[] = [];
    const rest: BurstCue[] = [];
    for (const cue of this.burstCues) {
      if (this.displayClockMs >= cue.atMs) due.push(cue);
      else rest.push(cue);
    }
    this.burstCues.length = 0;
    this.burstCues.push(...rest);
    for (const cue of due) {
      this.spawnKillBurst(cue.x, cue.y);
    }
  }

  private stepShockwaves(dtMs: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i -= 1) {
      const slot = this.shockwaves[i];
      if (!slot) continue;
      slot.lifeMs -= dtMs;
      const t = 1 - Math.max(0, slot.lifeMs / slot.maxLifeMs);
      slot.arc.setScale(1 + t * 1.2);
      slot.arc.setAlpha(Math.max(0, 1 - t));
      if (slot.lifeMs <= 0) {
        slot.arc.destroy();
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private resetShake(): void {
    if (!this.shakeApplied) return;
    this.shakeApplied = false;
    this.shakePx = 0;
    this.scene.cameras.main.scrollX = 0;
    this.scene.cameras.main.scrollY = 0;
  }

  private stepShake(dtMs: number): void {
    if (this.shakeRemainingMs <= 0 || this.shakePx <= 0) {
      this.resetShake();
      return;
    }
    this.shakeRemainingMs -= dtMs;
    const ox = (this.random.next() * 2 - 1) * this.shakePx;
    const oy = (this.random.next() * 2 - 1) * this.shakePx;
    this.scene.cameras.main.scrollX = ox;
    this.scene.cameras.main.scrollY = oy;
    this.shakeApplied = true;
    if (this.shakeRemainingMs <= 0) {
      this.resetShake();
    }
  }

  private stepCallout(): void {
    if (!this.callout.visible) return;
    if (this.displayClockMs >= this.calloutUntilMs) {
      this.callout.setVisible(false);
    }
  }

  private stepVignette(): void {
    if (this.displayClockMs >= this.vignetteUntilMs) {
      this.vignette.setFillStyle(0xff4f64, 0);
    }
  }
}

function countLive(pool: readonly { live: boolean }[]): number {
  let n = 0;
  for (const slot of pool) {
    if (slot.live) n += 1;
  }
  return n;
}

function comboFallbackCallout(combo: number): string | null {
  if (combo >= 50) return 'ABSURDLY LEAN';
  if (combo >= 25) return 'SHREDDED';
  if (combo >= 10) return 'FAT BURN';
  if (combo >= 5) return 'WARM UP';
  return null;
}
