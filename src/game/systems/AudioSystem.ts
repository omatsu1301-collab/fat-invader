import type { SaveDataV1 } from './PersistenceSystem';

export type AudioCue = 'shot' | 'hit' | 'pickup' | 'bossKill' | 'ui';

/**
 * Minimal WebAudio oscillator beeps. Mute-safe, unlock-on-gesture, destroyable.
 * Placeholder until authored assets exist — never drives combat outcomes.
 */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private destroyed = false;
  private settings: SaveDataV1['settings'];
  private unlockHandlers: Array<() => void> = [];

  constructor(settings: SaveDataV1['settings']) {
    this.settings = { ...settings };
  }

  setSettings(settings: Partial<SaveDataV1['settings']>): void {
    this.settings = { ...this.settings, ...settings };
  }

  /** Attach one-shot pointer/key listeners so AudioContext can resume after gesture. */
  unlockOnGesture(scene: {
    input: {
      on: (event: string, fn: () => void) => void;
      off: (event: string, fn: () => void) => void;
      keyboard?: { on: (event: string, fn: () => void) => void; off: (event: string, fn: () => void) => void } | null;
    };
  }): void {
    const unlock = (): void => {
      void this.unlock();
      for (const remove of this.unlockHandlers) remove();
      this.unlockHandlers = [];
    };
    const onPointer = (): void => unlock();
    const onKey = (): void => unlock();
    scene.input.on('pointerdown', onPointer);
    this.unlockHandlers.push(() => scene.input.off('pointerdown', onPointer));
    if (scene.input.keyboard) {
      scene.input.keyboard.on('keydown', onKey);
      this.unlockHandlers.push(() => scene.input.keyboard?.off('keydown', onKey));
    }
  }

  async unlock(): Promise<void> {
    if (this.destroyed || this.unlocked) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.unlocked = true;
    } catch {
      this.unlocked = false;
    }
  }

  playSe(cue: AudioCue): void {
    if (this.destroyed || !this.settings.se || !this.unlocked || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (cue) {
      case 'shot':
        osc.frequency.value = 520;
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        break;
      case 'hit':
        osc.frequency.value = 180;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.11);
        break;
      case 'pickup':
        osc.type = 'triangle';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      case 'bossKill':
        osc.type = 'sawtooth';
        osc.frequency.value = 140;
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      case 'ui':
      default:
        osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
    }
  }

  /** Soft loop placeholder — gated by bgm; no-op until assets exist. */
  playBgmPlaceholder(): void {
    if (this.destroyed || !this.settings.bgm || !this.unlocked || !this.ctx) return;
    // Intentionally silent placeholder so mute/BGM toggles remain testable.
  }

  destroy(): void {
    this.destroyed = true;
    for (const remove of this.unlockHandlers) remove();
    this.unlockHandlers = [];
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
