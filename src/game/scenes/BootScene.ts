import Phaser from 'phaser';
import { NORTH_STAR_ASSETS, runtimeLoadPath } from '../content/asset-manifest';

/**
 * Boot preloads Human-approved North Star PNGs under existing TextureKey values.
 * Paths always use `import.meta.env.BASE_URL` so GitHub Pages `/fat-invader/` works.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    for (const asset of NORTH_STAR_ASSETS) {
      this.load.image(asset.textureKey, `${base}${runtimeLoadPath(asset)}`);
    }
  }

  create(): void {
    this.registry.set('currentScene', 'BootScene');
    this.scene.start('TitleScene');
  }
}
