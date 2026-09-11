/** Shared North Star pixel asset definitions for process/verify scripts. */

export const CORE_PALETTE = [
  '#21102F',
  '#53F6FF',
  '#B9FF4A',
  '#FF4F64',
  '#FFB33D',
  '#FF71C8',
  '#FFF0D2',
  '#9D93B5',
];

export const EXTENDED_PALETTE = ['#FFD27A', '#C43B3B', '#6B3A22', '#7CB342'];

export const FULL_PALETTE = [...CORE_PALETTE, ...EXTENDED_PALETTE];

/** Player maps into cream / potato / patty / coral / muted / plum — no cyan armor. */
export const PLAYER_PALETTE = FULL_PALETTE.filter((c) => c !== '#53F6FF');

export const RAW_BATCH_DIR = 'assets-src/raw/chatgpt-2026-09-10';

/**
 * @typedef {object} PixelAssetDef
 * @property {string} id
 * @property {string} textureKey
 * @property {string} rawFile
 * @property {string} rawSha256
 * @property {number} rawWidth
 * @property {number} rawHeight
 * @property {number} runtimeWidth
 * @property {number} runtimeHeight
 * @property {number} maxVisibleWidth
 * @property {number} maxVisibleHeight
 * @property {string} masterRel
 * @property {string} processedRel
 * @property {string} publicRel
 * @property {string[]} palette
 * @property {string} subject
 * @property {string} humanDecision
 */

/** @type {PixelAssetDef[]} */
export const PIXEL_ASSETS = [
  {
    id: 'pixel.player.sannichibouzu.idle',
    textureKey: 'tex-player',
    rawFile: 'player_sannichibouzu.png',
    rawSha256: 'e91e4d34361deeae54909576ade7eeff519df701edd072d54d3a252ecd921d27',
    rawWidth: 1254,
    rawHeight: 1254,
    runtimeWidth: 40,
    runtimeHeight: 40,
    maxVisibleWidth: 38,
    maxVisibleHeight: 38,
    masterRel: 'assets-src/masters/player/player_sannichibouzu_idle.png',
    processedRel: 'assets-src/processed/player/player_sannichibouzu_idle.png',
    publicRel: 'public/assets/sprites/player/player_sannichibouzu.png',
    palette: PLAYER_PALETTE,
    subject: '三日坊主号 — pot-bellied office worker on homemade exercise-bike vehicle',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.enemy.fryScout.idle',
    textureKey: 'tex-enemy-fry-scout',
    rawFile: 'enemy_fry_scout.png',
    rawSha256: '929d615974dcdc76d0955b006787521c65786cca8331c1d5c93b143a77cb5885',
    rawWidth: 1254,
    rawHeight: 1254,
    runtimeWidth: 28,
    runtimeHeight: 28,
    maxVisibleWidth: 24,
    maxVisibleHeight: 24,
    masterRel: 'assets-src/masters/enemies/enemy_fry_scout_idle.png',
    processedRel: 'assets-src/processed/enemies/enemy_fry_scout_idle.png',
    publicRel: 'public/assets/sprites/enemies/fry_scout.png',
    palette: FULL_PALETTE,
    subject: 'FRY SCOUT — red carton fries scout with thin legs',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.bullet.playerCrumpledCheckup',
    textureKey: 'tex-bullet-player',
    rawFile: 'bullet_player_crumpled_checkup.png',
    rawSha256: 'dc198ed4110db526d6664a8749f1e6a3542d9e7edb613147e19301d24ca3df86',
    rawWidth: 1300,
    rawHeight: 1209,
    runtimeWidth: 12,
    runtimeHeight: 16,
    maxVisibleWidth: 12,
    maxVisibleHeight: 12,
    masterRel: 'assets-src/masters/bullets/bullet_player_crumpled_checkup.png',
    processedRel: 'assets-src/processed/bullets/bullet_player_crumpled_checkup.png',
    publicRel: 'public/assets/sprites/bullets/player_crumpled_checkup.png',
    palette: FULL_PALETTE,
    subject: 'くしゃ紙弾 — crumpled medical-checkup paper wad projectile',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.bullet.goldenFry',
    textureKey: 'tex-bullet-fry',
    rawFile: 'bullet_enemy_golden_fry.png',
    rawSha256: '5b2edc67601acd715eb993f0786e1dd11edb3ca5db875a7d5010c2ca8e607ca9',
    rawWidth: 1300,
    rawHeight: 1209,
    runtimeWidth: 14,
    runtimeHeight: 14,
    maxVisibleWidth: 12,
    maxVisibleHeight: 12,
    masterRel: 'assets-src/masters/bullets/bullet_enemy_golden_fry.png',
    processedRel: 'assets-src/processed/bullets/bullet_enemy_golden_fry.png',
    publicRel: 'public/assets/sprites/bullets/enemy_golden_fry.png',
    palette: FULL_PALETTE,
    subject: '黄金フライ弾 — dense aligned golden fry bundle',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.boss.kingBurger.idle',
    textureKey: 'tex-boss-king-burger-mini',
    rawFile: 'boss_king_burger.png',
    rawSha256: 'e86beec0ee26fa9ce57f4255b0a58a7a1d8c45daec591ead54d9dc61e94d88c5',
    rawWidth: 1448,
    rawHeight: 1086,
    runtimeWidth: 96,
    runtimeHeight: 72,
    maxVisibleWidth: 88,
    maxVisibleHeight: 66,
    masterRel: 'assets-src/masters/bosses/boss_king_burger_idle.png',
    processedRel: 'assets-src/processed/bosses/boss_king_burger_idle.png',
    publicRel: 'public/assets/sprites/bosses/king_burger_mini.png',
    palette: FULL_PALETTE,
    subject: 'KING BURGER — crowned multi-layer burger boss',
    humanDecision: 'PASS 2026-09-10',
  },
];

export const TERMS = {
  generator: 'ChatGPT image generation',
  generatedOn: '2026-09-10',
  termsUrl: 'https://openai.com/policies/row-terms-of-use/',
  termsEffectiveOn: '2026-01-01',
  termsCheckedOn: '2026-09-10',
  similarityRiskReviewed: true,
};
