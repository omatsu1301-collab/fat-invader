import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';

const COLOR_VOID = '#090615';
const COLOR_PLAYER_CYAN = '#53F6FF';
const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Phase 0 placeholder per FI-06 section 3: displays Title copy and accepts
 * start input, but does not transition into gameplay — GameScene ships in
 * Milestone A.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.registry.set('currentScene', 'TitleScene');
    this.registry.set('startPressCount', 0);

    this.cameras.main.setBackgroundColor(COLOR_VOID);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.32, 'FAT INVADER', {
        fontFamily: 'monospace',
        fontSize: '40px',
        color: COLOR_PLAYER_CYAN,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.4, '誘惑を、撃ち落とせ。', {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: COLOR_MILK_CREAM,
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

    const registerStartPress = (): void => {
      const count = (this.registry.get('startPressCount') as number) + 1;
      this.registry.set('startPressCount', count);
      startText.setAlpha(0.6);
      this.time.delayedCall(120, () => startText.setAlpha(1));
    };

    startText.on('pointerdown', registerStartPress);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ]);
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on('down', registerStartPress);
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER).on('down', registerStartPress);
    }
  }
}
