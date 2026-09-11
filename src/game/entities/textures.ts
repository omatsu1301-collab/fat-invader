import Phaser from 'phaser';

const COLOR_OUTLINE = 0x21102f;
const COLOR_FOOD_AMBER = 0xffb33d;
const COLOR_DANGER_CORAL = 0xff4f64;
const COLOR_SWEETS_PINK = 0xff71c8;
const COLOR_BURN_LIME = 0xb9ff4a;
const COLOR_SKIN = 0xf0c8a0;
const COLOR_SUIT = 0x3a4560;
const COLOR_TIE = 0xc0392b;
const COLOR_SHIRT = 0xf5f0e6;
const COLOR_DONUT = 0xe8a0c8;
const COLOR_SODA = 0x5bc0eb;
const COLOR_PIZZA = 0xe85d04;
const COLOR_CAKE = 0xffc2d1;
const COLOR_TAPIOCA = 0x6b4226;
const COLOR_LASER = 0xff6b6b;

export const TextureKey = {
  player: 'tex-player',
  /** Reference / future skin — not bound as runtime Player (Human 2026-09-11). */
  playerSannichibouzuRef: 'tex-player-sannichibouzu-ref',
  enemyFryScout: 'tex-enemy-fry-scout',
  enemyDonutDrifter: 'tex-enemy-donut-drifter',
  enemySodaTank: 'tex-enemy-soda-tank',
  enemyPizzaCutter: 'tex-enemy-pizza-cutter',
  enemyCakeCaster: 'tex-enemy-cake-caster',
  bossKingBurgerMini: 'tex-boss-king-burger-mini',
  bossPizzaMother: 'tex-boss-pizza-mother',
  bossKingCalorie: 'tex-boss-king-calorie',
  bulletPlayer: 'tex-bullet-player',
  bulletFry: 'tex-bullet-fry',
  bulletDonut: 'tex-bullet-donut',
  bulletPizza: 'tex-bullet-pizza',
  bulletTapioca: 'tex-bullet-tapioca',
  bulletCake: 'tex-bullet-cake',
  bulletLaser: 'tex-bullet-laser',
  pickupProtein: 'tex-pickup-protein',
  pickupCaffeine: 'tex-pickup-caffeine',
  pickupCardio: 'tex-pickup-cardio',
  pickupFatBurn: 'tex-pickup-fatburn',
  pickupCheatDay: 'tex-pickup-cheatday',
  pickupPlaceholder: 'tex-pickup-placeholder',
  tellMarker: 'tex-tell-marker',
  particle: 'tex-vfx-particle',
  fragment: 'tex-vfx-fragment',
} as const;

/**
 * Graybox / fallback textures. Salaryman Player is always generated here —
 * North Star 三日坊主号 is no longer the runtime Player visual.
 */
export function ensurePlaceholderTextures(scene: Phaser.Scene): void {
  const g = scene.add.graphics();

  // Always (re)generate salaryman so Boot North Star cannot leave cyan/bike art on player key.
  if (scene.textures.exists(TextureKey.player)) {
    scene.textures.remove(TextureKey.player);
  }
  g.clear();
  // Flying salaryman silhouette: head, body, necktie — high contrast, no polish.
  g.fillStyle(COLOR_OUTLINE, 1);
  g.fillCircle(20, 10, 9);
  g.fillStyle(COLOR_SKIN, 1);
  g.fillCircle(20, 10, 7);
  g.fillStyle(COLOR_OUTLINE, 1);
  g.fillRoundedRect(10, 18, 20, 18, 3);
  g.fillStyle(COLOR_SUIT, 1);
  g.fillRoundedRect(12, 19, 16, 15, 2);
  g.fillStyle(COLOR_SHIRT, 1);
  g.fillTriangle(20, 19, 16, 34, 24, 34);
  g.fillStyle(COLOR_TIE, 1);
  g.fillTriangle(20, 20, 18, 33, 22, 33);
  // Simple "flying" arm wing marks
  g.fillStyle(COLOR_SUIT, 1);
  g.fillRect(4, 22, 8, 4);
  g.fillRect(28, 22, 8, 4);
  g.generateTexture(TextureKey.player, 40, 40);

  if (!scene.textures.exists(TextureKey.enemyFryScout)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 28, 28, 4);
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillRoundedRect(2, 2, 24, 24, 3);
    g.generateTexture(TextureKey.enemyFryScout, 28, 28);
  }

  if (!scene.textures.exists(TextureKey.enemyDonutDrifter)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(15, 15, 14);
    g.fillStyle(COLOR_DONUT, 1);
    g.fillCircle(15, 15, 12);
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(15, 15, 5);
    g.fillStyle(0x090615, 1);
    g.fillCircle(15, 15, 4);
    g.generateTexture(TextureKey.enemyDonutDrifter, 30, 30);
  }

  if (!scene.textures.exists(TextureKey.enemySodaTank)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(2, 2, 32, 32, 4);
    g.fillStyle(COLOR_SODA, 1);
    g.fillRoundedRect(4, 4, 28, 28, 3);
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRect(14, 0, 8, 8);
    g.generateTexture(TextureKey.enemySodaTank, 36, 36);
  }

  if (!scene.textures.exists(TextureKey.enemyPizzaCutter)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillTriangle(15, 2, 28, 28, 2, 28);
    g.fillStyle(COLOR_PIZZA, 1);
    g.fillTriangle(15, 6, 24, 26, 6, 26);
    g.generateTexture(TextureKey.enemyPizzaCutter, 30, 30);
  }

  if (!scene.textures.exists(TextureKey.enemyCakeCaster)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(2, 8, 28, 22, 4);
    g.fillStyle(COLOR_CAKE, 1);
    g.fillRoundedRect(4, 10, 24, 18, 3);
    g.fillStyle(COLOR_SWEETS_PINK, 1);
    g.fillCircle(16, 8, 6);
    g.generateTexture(TextureKey.enemyCakeCaster, 32, 32);
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

  if (!scene.textures.exists(TextureKey.bossPizzaMother)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(50, 39, 38);
    g.fillStyle(COLOR_PIZZA, 1);
    g.fillCircle(50, 39, 34);
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillCircle(50, 39, 10);
    g.generateTexture(TextureKey.bossPizzaMother, 100, 78);
  }

  if (!scene.textures.exists(TextureKey.bossKingCalorie)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(4, 4, 100, 76, 10);
    g.fillStyle(COLOR_DANGER_CORAL, 1);
    g.fillRoundedRect(8, 8, 92, 68, 8);
    g.fillStyle(COLOR_BURN_LIME, 1);
    g.fillRect(20, 30, 68, 12);
    g.generateTexture(TextureKey.bossKingCalorie, 108, 84);
  }

  if (!scene.textures.exists(TextureKey.bulletPlayer)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 12, 16, 2);
    g.fillStyle(0xe8e0d4, 1);
    g.fillRoundedRect(1, 1, 10, 14, 2);
    g.generateTexture(TextureKey.bulletPlayer, 12, 16);
  }

  if (!scene.textures.exists(TextureKey.bulletFry)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(7, 7, 7);
    g.fillStyle(COLOR_DANGER_CORAL, 1);
    g.fillCircle(7, 7, 5);
    g.generateTexture(TextureKey.bulletFry, 14, 14);
  }

  if (!scene.textures.exists(TextureKey.bulletDonut)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(COLOR_DONUT, 1);
    g.fillCircle(8, 8, 6);
    g.fillStyle(0x090615, 1);
    g.fillCircle(8, 8, 2);
    g.generateTexture(TextureKey.bulletDonut, 16, 16);
  }

  if (!scene.textures.exists(TextureKey.bulletPizza)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillTriangle(8, 0, 16, 16, 0, 16);
    g.fillStyle(COLOR_PIZZA, 1);
    g.fillTriangle(8, 3, 13, 14, 3, 14);
    g.generateTexture(TextureKey.bulletPizza, 16, 16);
  }

  if (!scene.textures.exists(TextureKey.bulletTapioca)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillCircle(5, 5, 5);
    g.fillStyle(COLOR_TAPIOCA, 1);
    g.fillCircle(5, 5, 3);
    g.generateTexture(TextureKey.bulletTapioca, 10, 10);
  }

  if (!scene.textures.exists(TextureKey.bulletCake)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 22, 22, 4);
    g.fillStyle(COLOR_CAKE, 1);
    g.fillRoundedRect(2, 2, 18, 18, 3);
    g.generateTexture(TextureKey.bulletCake, 22, 22);
  }

  if (!scene.textures.exists(TextureKey.bulletLaser)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRect(0, 0, 18, 18);
    g.fillStyle(COLOR_LASER, 1);
    g.fillRect(2, 2, 14, 14);
    g.generateTexture(TextureKey.bulletLaser, 18, 18);
  }

  const pickups: Array<[string, number, string]> = [
    [TextureKey.pickupProtein, 0x7bdff2, 'P'],
    [TextureKey.pickupCaffeine, 0xffd166, 'Cf'],
    [TextureKey.pickupCardio, 0x06d6a0, 'Cd'],
    [TextureKey.pickupFatBurn, 0xef476f, 'FB'],
    [TextureKey.pickupCheatDay, 0xff9f1c, '+20'],
  ];
  for (const [key, color] of pickups) {
    if (scene.textures.exists(key)) continue;
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRoundedRect(0, 0, 24, 24, 4);
    g.fillStyle(color, 1);
    g.fillRoundedRect(2, 2, 20, 20, 3);
    g.generateTexture(key, 24, 24);
  }

  if (!scene.textures.exists(TextureKey.pickupPlaceholder)) {
    g.clear();
    g.fillStyle(COLOR_BURN_LIME, 1);
    g.fillCircle(11, 11, 11);
    g.generateTexture(TextureKey.pickupPlaceholder, 22, 22);
  }

  if (!scene.textures.exists(TextureKey.tellMarker)) {
    g.clear();
    g.lineStyle(2, COLOR_DANGER_CORAL, 1);
    g.strokeRect(1, 1, 14, 30);
    g.generateTexture(TextureKey.tellMarker, 16, 32);
  }

  if (!scene.textures.exists(TextureKey.particle)) {
    g.clear();
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture(TextureKey.particle, 8, 8);
  }

  if (!scene.textures.exists(TextureKey.fragment)) {
    g.clear();
    g.fillStyle(COLOR_OUTLINE, 1);
    g.fillRect(0, 0, 8, 6);
    g.fillStyle(COLOR_FOOD_AMBER, 1);
    g.fillRect(1, 1, 6, 4);
    g.generateTexture(TextureKey.fragment, 8, 6);
  }

  g.destroy();
}
