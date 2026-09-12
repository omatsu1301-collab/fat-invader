import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { loadSaveData, saveSettings, type SaveDataV1 } from '../systems/PersistenceSystem';
import { AudioSystem } from '../systems/AudioSystem';

const COLOR_VOID = '#090615';
const COLOR_PLAYER_CYAN = '#53F6FF';
const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * FI-03 section 2.2: shows Title copy, How to Play, settings toggles, and
 * high score, then moves to GameScene on START. Registers its own listeners
 * and tears them down on shutdown so bouncing Title -> Game -> Result -> Title
 * never accumulates handlers (FI-05 section 6.3).
 */
export class TitleScene extends Phaser.Scene {
  private readonly storage = new LocalStorageAdapter();
  private keyboardKeys: Phaser.Input.Keyboard.Key[] = [];
  private registerStartPress: (() => void) | null = null;
  private startText: Phaser.GameObjects.Text | null = null;
  private settings: SaveDataV1['settings'] = loadSaveData(new LocalStorageAdapter()).settings;
  private audio: AudioSystem | null = null;
  private settingLabels: Partial<Record<keyof SaveDataV1['settings'], Phaser.GameObjects.Text>> = {};

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.registry.set('currentScene', 'TitleScene');
    this.registry.set('startPressCount', 0);
    this.keyboardKeys = [];
    this.settingLabels = {};

    this.cameras.main.setBackgroundColor(COLOR_VOID);

    const saveData = loadSaveData(this.storage);
    this.settings = { ...saveData.settings };
    this.audio = new AudioSystem(this.settings);
    this.audio.unlockOnGesture(this);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.14, 'FAT INVADER', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: COLOR_PLAYER_CYAN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.22, '誘惑を、撃ち落とせ。', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: COLOR_MILK_CREAM,
      })
      .setOrigin(0.5);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.3, `HI SCORE ${saveData.highScore}`, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: COLOR_UI_MUTED,
      })
      .setOrigin(0.5);

    const howTo = isTouchDevice()
      ? 'HOW TO PLAY\nDRAG to move · AUTO FIRE\n避ける · 拾う · ボスを落とせ'
      : 'HOW TO PLAY\n← → move · SPACE fire\n避ける · 拾う · ボスを落とせ';
    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.42, howTo, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLOR_MILK_CREAM,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    this.buildSettingToggle('bgm', 'BGM', LOGICAL_HEIGHT * 0.56);
    this.buildSettingToggle('se', 'SE', LOGICAL_HEIGHT * 0.61);
    this.buildSettingToggle('screenShake', 'SHAKE', LOGICAL_HEIGHT * 0.66);
    this.buildSettingToggle('reducedEffects', 'REDUCED', LOGICAL_HEIGHT * 0.71);

    const startText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.84, 'START', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: COLOR_BURN_LIME,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.startText = startText;

    let started = false;
    const registerStartPress = (): void => {
      const count = (this.registry.get('startPressCount') as number) + 1;
      this.registry.set('startPressCount', count);
      startText.setAlpha(0.6);
      this.audio?.playSe('ui');

      if (started) return;
      started = true;
      this.time.delayedCall(150, () => this.scene.start('GameScene'));
    };
    this.registerStartPress = registerStartPress;

    startText.on('pointerdown', registerStartPress);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ]);
      const spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      const enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      spaceKey.on('down', registerStartPress);
      enterKey.on('down', registerStartPress);
      this.keyboardKeys = [spaceKey, enterKey];
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private buildSettingToggle(
    key: 'bgm' | 'se' | 'screenShake' | 'reducedEffects',
    label: string,
    y: number,
  ): void {
    const text = this.add
      .text(LOGICAL_WIDTH / 2, y, this.formatSettingLabel(key, label), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: COLOR_UI_MUTED,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.settingLabels[key] = text;
    text.on('pointerdown', () => {
      this.toggleSetting(key, label);
      this.audio?.playSe('ui');
    });
  }

  private formatSettingLabel(
    key: 'bgm' | 'se' | 'screenShake' | 'reducedEffects',
    label: string,
  ): string {
    if (key === 'screenShake') {
      return `${label}: ${this.settings.screenShake.toUpperCase()}`;
    }
    if (key === 'reducedEffects') {
      return `${label}: ${this.settings.reducedEffects ? 'ON' : 'OFF'}`;
    }
    return `${label}: ${this.settings[key] ? 'ON' : 'OFF'}`;
  }

  private toggleSetting(
    key: 'bgm' | 'se' | 'screenShake' | 'reducedEffects',
    label: string,
  ): void {
    const current = loadSaveData(this.storage);
    if (key === 'screenShake') {
      const order: Array<SaveDataV1['settings']['screenShake']> = ['full', 'reduced', 'off'];
      const idx = order.indexOf(this.settings.screenShake);
      this.settings.screenShake = order[(idx + 1) % order.length]!;
    } else if (key === 'reducedEffects') {
      this.settings.reducedEffects = !this.settings.reducedEffects;
    } else {
      this.settings[key] = !this.settings[key];
    }
    const saved = saveSettings(this.storage, current, this.settings);
    this.settings = saved.settings;
    this.audio?.setSettings(this.settings);
    const text = this.settingLabels[key];
    if (text) text.setText(this.formatSettingLabel(key, label));
  }

  private handleShutdown(): void {
    if (this.registerStartPress) {
      this.startText?.off('pointerdown', this.registerStartPress);
      for (const key of this.keyboardKeys) {
        key.off('down', this.registerStartPress);
      }
    }
    this.audio?.destroy();
    this.audio = null;
    this.time.removeAllEvents();
  }
}
