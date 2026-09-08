import Phaser from 'phaser';

/**
 * Phase 0 has no real assets to preload yet; Boot exists as the fixed
 * entry point future asset/save loading (FI-03 section 2.1) will attach to.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.registry.set('currentScene', 'BootScene');
    this.scene.start('TitleScene');
  }
}
