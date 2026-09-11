import Phaser from 'phaser';
import { NORTH_STAR_ASSETS, runtimeLoadPath } from '../content/asset-manifest';
import { TextureKey } from '../entities/textures';

/**
 * Boot preloads Human-approved North Star PNGs used at runtime.
 * 三日坊主号 is loaded under a reference key only — runtime Player is graybox salaryman.
 * Paths always use `import.meta.env.BASE_URL` so GitHub Pages `/fat-invader/` works.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    for (const asset of NORTH_STAR_ASSETS) {
      // Do not bind reference-only player art onto the live player texture key.
      if (asset.textureKey === TextureKey.playerSannichibouzuRef) {
        this.load.image(asset.textureKey, `${base}${runtimeLoadPath(asset)}`);
        continue;
      }
      this.load.image(asset.textureKey, `${base}${runtimeLoadPath(asset)}`);
    }
  }

  create(): void {
    this.registry.set('currentScene', 'BootScene');
    this.scene.start('TitleScene');
  }
}
