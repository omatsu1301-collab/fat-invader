import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';
import { LocalStorageAdapter } from '../adapters/LocalStorageAdapter';
import { loadSaveData } from '../systems/PersistenceSystem';

const COLOR_VOID = '#090615';
const COLOR_PLAYER_CYAN = '#53F6FF';
const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * FI-03 section 2.2: shows Title copy, control hint, and high score, then
 * moves to GameScene on any start input. Registers its own listeners and
 * tears them down on shutdown so bouncing Title -> Game -> Result -> Title
 * never accumulates handlers (FI-05 section 6.3).
 */
export class TitleScene extends Phaser.Scene {
  private readonly storage = new LocalStorageAdapter();
  private keyboardKeys: Phaser.Input.Keyboard.Key[] = [];
  private registerStartPress: (() => void) | null = null;
  private startText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.registry.set('currentScene', 'TitleScene');
    this.registry.set('startPressCount', 0);
    this.keyboardKeys = [];

    this.cameras.main.setBackgroundColor(COLOR_VOID);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.3, 'FAT INVADER', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: COLOR_PLAYER_CYAN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.38, '誘惑を、撃ち落とせ。', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: COLOR_MILK_CREAM,
      })
      .setOrigin(0.5);

    const saveData = loadSaveData(this.storage);
    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.46, `HI SCORE ${saveData.highScore}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLOR_UI_MUTED,
      })
      .setOrigin(0.5);

    const controlHint = isTouchDevice() ? 'DRAG / AUTO FIRE' : '← → / SPACE';

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.68, controlHint, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: COLOR_UI_MUTED,
      })
      .setOrigin(0.5);

    const startText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.76, 'START', {
        fontFamily: 'monospace',
        fontSize: '20px',
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

      // FI-03 section 2.2: one action moves Title -> Play; AC-100 requires
      // gameplay to be operable within 2s of the press.
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

  private handleShutdown(): void {
    if (this.registerStartPress) {
      this.startText?.off('pointerdown', this.registerStartPress);
      for (const key of this.keyboardKeys) {
        key.off('down', this.registerStartPress);
      }
    }
    this.time.removeAllEvents();
  }
}
