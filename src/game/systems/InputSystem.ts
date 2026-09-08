import Phaser from 'phaser';

export type InputIntent = {
  /** Desktop keyboard axis: -1 left, 0 none, 1 right. Null when a drag is active. */
  moveAxis: -1 | 0 | 1;
  /** Mobile drag target in scene X coordinates, or null when not dragging. */
  dragTargetX: number | null;
  firing: boolean;
  pauseRequested: boolean;
};

/**
 * FI-02 section 4: desktop keyboard (Left/A, Right/D, Space/J shoot, Esc/P
 * pause) and mobile single-pointer drag with auto-fire. Registers all
 * listeners itself and exposes `destroy()` so GameScene can guarantee no
 * listener survives a restart (FI-05 section 6.3, AC-135).
 */
export class InputSystem {
  private readonly scene: Phaser.Scene;
  private readonly isMobile: boolean;

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
  private keyA: Phaser.Input.Keyboard.Key | undefined;
  private keyD: Phaser.Input.Keyboard.Key | undefined;
  private keySpace: Phaser.Input.Keyboard.Key | undefined;
  private keyJ: Phaser.Input.Keyboard.Key | undefined;
  private keyEsc: Phaser.Input.Keyboard.Key | undefined;
  private keyP: Phaser.Input.Keyboard.Key | undefined;

  private pauseRequested = false;
  private activePointerId: number | null = null;
  private dragTargetX: number | null = null;

  private readonly onPointerDown: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerMove: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPointerUp: (pointer: Phaser.Input.Pointer) => void;
  private readonly onPauseKey: () => void;

  constructor(scene: Phaser.Scene, isMobile: boolean) {
    this.scene = scene;
    this.isMobile = isMobile;

    const keyboard = scene.input.keyboard;
    if (keyboard) {
      keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
      ]);
      this.cursors = keyboard.createCursorKeys();
      this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyJ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
      this.keyEsc = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    }

    this.onPauseKey = (): void => {
      this.pauseRequested = true;
    };
    this.keyEsc?.on('down', this.onPauseKey);
    this.keyP?.on('down', this.onPauseKey);

    // FI-02 section 4.2: single active pointer only, ignore additional touches.
    this.onPointerDown = (pointer): void => {
      if (this.activePointerId !== null) return;
      this.activePointerId = pointer.id;
      this.dragTargetX = pointer.worldX;
    };
    this.onPointerMove = (pointer): void => {
      if (pointer.id !== this.activePointerId) return;
      this.dragTargetX = pointer.worldX;
    };
    this.onPointerUp = (pointer): void => {
      if (pointer.id !== this.activePointerId) return;
      this.activePointerId = null;
      this.dragTargetX = null;
    };

    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
  }

  poll(): InputIntent {
    const left = Boolean(this.cursors?.left.isDown) || Boolean(this.keyA?.isDown);
    const right = Boolean(this.cursors?.right.isDown) || Boolean(this.keyD?.isDown);
    // AC-105: simultaneous left+right yields zero horizontal velocity.
    const moveAxis: -1 | 0 | 1 = left === right ? 0 : left ? -1 : 1;

    const firing =
      this.isMobile || Boolean(this.keySpace?.isDown) || Boolean(this.keyJ?.isDown);

    const pauseRequested = this.pauseRequested;
    this.pauseRequested = false;

    return { moveAxis, dragTargetX: this.dragTargetX, firing, pauseRequested };
  }

  destroy(): void {
    this.keyEsc?.off('down', this.onPauseKey);
    this.keyP?.off('down', this.onPauseKey);
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);
    this.scene.input.keyboard?.removeAllKeys(true);
  }
}
