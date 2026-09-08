import Phaser from 'phaser';

const COLOR_PLAYER_CYAN = 0x53f6ff;
const COLOR_FOOD_AMBER = 0xffb33d;
const COLOR_DANGER_CORAL = 0xff4f64;
const COLOR_SWEETS_PINK = 0xff71c8;
const COLOR_BURN_LIME = 0xb9ff4a;
const COLOR_OUTLINE = 0x21102f;

export const TextureKey = {
  player: 'tex-player',
  enemyFryScout: 'tex-enemy-fry-scout',
  bossKingBurgerMini: 'tex-boss-king-burger-mini',
  bulletPlayer: 'tex-bullet-player',
  bulletFry: 'tex-bullet-fry',
  pickupPlaceholder: 'tex-pickup-placeholder',
} as const;

/**
 * FI-04 section 12 Placeholder Strategy: Milestone A ships primitive shapes
 * under the same ids final sprites will later replace. Generated once per
 * Phaser.Game instance (the texture manager persists across scene restarts),
 * guarded by `exists()` so repeated GameScene creation never duplicates work.
 */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  if (!scene.textures.exists(TextureKey.player)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 40, 40, 8);
    g.fillStyle(COLOR_PLAYER_CYAN, 1);
    g.fillRoundedRect(3, 3, 34, 34, 6);
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(14, 16, 3);
    g.fillCircle(26, 16, 3);
    g.generateTexture(TextureKey.player, 40, 40);
  }

  if (!scene.textures.exists(TextureKey.enemyFryScout)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 28, 28, 4);
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillRoundedRect(2, 2, 24, 24, 3);
    g.generateTexture(TextureKey.enemyFryScout, 28, 28);
  }

  if (!scene.textures.exists(TextureKey.bossKingBurgerMini)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 96, 72, 12);
    g.fillStyle(COLOR_SWEETS_PINK, 1);
    g.fillRoundedRect(4, 4, 88, 64, 10);
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillRoundedRect(12, 14, 72, 16, 6);
    g.generateTexture(TextureKey.bossKingBurgerMini, 96, 72);
  }

  if (!scene.textures.exists(TextureKey.bulletPlayer)) {
    g.clear();
    g.fillStyle(COLOR_PLAYER_CYAN, 1);
    g.fillRoundedRect(0, 0, 6, 16, 3);
    g.generateTexture(TextureKey.bulletPlayer, 6, 16);
  }

  if (!scene.textures.exists(TextureKey.bulletFry)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(7, 7, 7);
    g.fillStyle(COLOR_DANGER_CORAL, 1);
    g.fillCircle(7, 7, 5);
    g.generateTexture(TextureKey.bulletFry, 14, 14);
  }

  if (!scene.textures.exists(TextureKey.pickupPlaceholder)) {
    g.clear();
    g.fillStyle(COLOR_BURN_LIME, 1);
    g.fillCircle(11, 11, 11);
    g.generateTexture(TextureKey.pickupPlaceholder, 22, 22);
  }

  g.destroy();
}
