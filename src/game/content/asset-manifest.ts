/**
 * Runtime asset manifest for Pixel North Star (FI-10).
 * Paths are relative to `import.meta.env.BASE_URL` (never root `/assets/...`).
 *
 * Legacy note: GameScene still emits `weaponId: 'metabolicShot'` on SHOT_FIRED.
 * That identifier is internal/event-only, not player-facing copy. Visual weapon is くしゃ紙弾.
 */
import { TextureKey } from '../entities/textures';

export type AssetSourceMethod = 'human-drawn' | 'ai-generated' | 'hybrid' | 'placeholder';

export type AssetLicense = {
  spdx: string;
  holder: string;
  termsUrl: string;
  termsEffectiveOn: string;
  termsCheckedOn: string;
  commercialOk: boolean;
  generativeModelTermsOk: boolean;
  similarityRiskReviewed: boolean;
  notes: string;
};

export type AssetSource = {
  method: AssetSourceMethod;
  tool: string;
  promptSummary: string;
  operator: string;
  createdOn: string;
};

export type ProcessingStep = {
  action: string;
  notes: string;
};

export type PixelAssetRecord = {
  id: string;
  textureKey: string;
  role: 'player' | 'enemy' | 'boss' | 'bullet';
  northStar: boolean;
  humanGate: 'approved' | 'unreviewed' | 'rejected' | 'deferred';
  replacesPlaceholder: boolean;
  rawSourcePath: string;
  rawSourceWidth: number;
  rawSourceHeight: number;
  rawSha256: string;
  masterPath: string;
  processedPath: string;
  runtimePath: string;
  runtimeWidth: number;
  runtimeHeight: number;
  masterWidth: number;
  masterHeight: number;
  frameCount: number;
  pivot: { x: number; y: number };
  hitbox: { width: number; height: number; offsetX: number; offsetY: number };
  palette: string[];
  source: AssetSource;
  license: AssetLicense;
  processingHistory: ProcessingStep[];
  subject: string;
  humanDecision: string;
};

const TERMS_NOTES =
  'OpenAI relationship: user owns Output. Output may be non-unique. Not legal advice. Human reviewed third-party/brand similarity.';

const SHARED_LICENSE: AssetLicense = {
  spdx: 'LicenseRef-Internal',
  holder: 'omatsu1301-collab',
  termsUrl: 'https://openai.com/policies/row-terms-of-use/',
  termsEffectiveOn: '2026-01-01',
  termsCheckedOn: '2026-09-10',
  commercialOk: true,
  generativeModelTermsOk: true,
  similarityRiskReviewed: true,
  notes: TERMS_NOTES,
};

const SHARED_HISTORY: ProcessingStep[] = [
  { action: 'ingest-raw', notes: 'byte-for-byte handoff copy verified by SHA-256' },
  { action: 'index-palette', notes: 'nearest FI-10 closed palette; alpha binarize 0/255' },
  { action: 'defringe', notes: 'transparent RGB cleared to 0' },
  { action: 'crop', notes: 'opaque bbox crop before fit' },
  { action: 'nearest-to-master', notes: 'fit into runtime canvas; upscale ×4 to canonical master' },
  { action: 'nearest-downscale', notes: 'runtime is exact every-4th-pixel of master' },
  { action: 'pivot-pad', notes: 'center origin 0.5 on transparent canvas' },
];

function source(summary: string): AssetSource {
  return {
    method: 'ai-generated',
    tool: 'ChatGPT image generation',
    promptSummary: summary,
    operator: 'Creative Director + Implementation AI',
    createdOn: '2026-09-10',
  };
}

export const NORTH_STAR_ASSETS = [
  {
    id: 'pixel.player.sannichibouzu.idle',
    textureKey: TextureKey.player,
    role: 'player',
    northStar: true,
    humanGate: 'approved',
    replacesPlaceholder: true,
    rawSourcePath: 'assets-src/raw/chatgpt-2026-09-10/player_sannichibouzu.png',
    rawSourceWidth: 1254,
    rawSourceHeight: 1254,
    rawSha256: 'e91e4d34361deeae54909576ade7eeff519df701edd072d54d3a252ecd921d27',
    masterPath: 'assets-src/masters/player/player_sannichibouzu_idle.png',
    processedPath: 'assets-src/processed/player/player_sannichibouzu_idle.png',
    runtimePath: 'assets/sprites/player/player_sannichibouzu.png',
    runtimeWidth: 40,
    runtimeHeight: 40,
    masterWidth: 160,
    masterHeight: 160,
    frameCount: 1,
    pivot: { x: 0.5, y: 0.5 },
    hitbox: { width: 24, height: 28, offsetX: 8, offsetY: 6 },
    palette: [
      '#21102F',
      '#6B3A22',
      '#7CB342',
      '#9D93B5',
      '#C43B3B',
      '#FF4F64',
      '#FF71C8',
      '#FFB33D',
      '#FFD27A',
      '#FFF0D2',
    ],
    source: source('三日坊主号 office worker on exercise-bike vehicle'),
    license: SHARED_LICENSE,
    processingHistory: SHARED_HISTORY,
    subject: '三日坊主号',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.enemy.fryScout.idle',
    textureKey: TextureKey.enemyFryScout,
    role: 'enemy',
    northStar: true,
    humanGate: 'approved',
    replacesPlaceholder: true,
    rawSourcePath: 'assets-src/raw/chatgpt-2026-09-10/enemy_fry_scout.png',
    rawSourceWidth: 1254,
    rawSourceHeight: 1254,
    rawSha256: '929d615974dcdc76d0955b006787521c65786cca8331c1d5c93b143a77cb5885',
    masterPath: 'assets-src/masters/enemies/enemy_fry_scout_idle.png',
    processedPath: 'assets-src/processed/enemies/enemy_fry_scout_idle.png',
    runtimePath: 'assets/sprites/enemies/fry_scout.png',
    runtimeWidth: 28,
    runtimeHeight: 28,
    masterWidth: 112,
    masterHeight: 112,
    frameCount: 1,
    pivot: { x: 0.5, y: 0.5 },
    hitbox: { width: 23.8, height: 23.8, offsetX: 2.1, offsetY: 2.1 },
    palette: [
      '#21102F',
      '#6B3A22',
      '#9D93B5',
      '#C43B3B',
      '#FF4F64',
      '#FFB33D',
      '#FFD27A',
      '#FFF0D2',
    ],
    source: source('FRY SCOUT red carton fries scout'),
    license: SHARED_LICENSE,
    processingHistory: SHARED_HISTORY,
    subject: 'FRY SCOUT',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.bullet.playerCrumpledCheckup',
    textureKey: TextureKey.bulletPlayer,
    role: 'bullet',
    northStar: true,
    humanGate: 'approved',
    replacesPlaceholder: true,
    rawSourcePath: 'assets-src/raw/chatgpt-2026-09-10/bullet_player_crumpled_checkup.png',
    rawSourceWidth: 1300,
    rawSourceHeight: 1209,
    rawSha256: 'dc198ed4110db526d6664a8749f1e6a3542d9e7edb613147e19301d24ca3df86',
    masterPath: 'assets-src/masters/bullets/bullet_player_crumpled_checkup.png',
    processedPath: 'assets-src/processed/bullets/bullet_player_crumpled_checkup.png',
    runtimePath: 'assets/sprites/bullets/player_crumpled_checkup.png',
    runtimeWidth: 12,
    runtimeHeight: 16,
    masterWidth: 48,
    masterHeight: 64,
    frameCount: 1,
    pivot: { x: 0.5, y: 0.5 },
    hitbox: { width: 6, height: 16, offsetX: 3, offsetY: 0 },
    palette: ['#21102F', '#9D93B5', '#FFF0D2'],
    source: source('くしゃ紙弾 crumpled medical-checkup paper wad'),
    license: SHARED_LICENSE,
    processingHistory: SHARED_HISTORY,
    subject: 'くしゃ紙弾',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.bullet.goldenFry',
    textureKey: TextureKey.bulletFry,
    role: 'bullet',
    northStar: true,
    humanGate: 'approved',
    replacesPlaceholder: true,
    rawSourcePath: 'assets-src/raw/chatgpt-2026-09-10/bullet_enemy_golden_fry.png',
    rawSourceWidth: 1300,
    rawSourceHeight: 1209,
    rawSha256: '5b2edc67601acd715eb993f0786e1dd11edb3ca5db875a7d5010c2ca8e607ca9',
    masterPath: 'assets-src/masters/bullets/bullet_enemy_golden_fry.png',
    processedPath: 'assets-src/processed/bullets/bullet_enemy_golden_fry.png',
    runtimePath: 'assets/sprites/bullets/enemy_golden_fry.png',
    runtimeWidth: 14,
    runtimeHeight: 14,
    masterWidth: 56,
    masterHeight: 56,
    frameCount: 1,
    pivot: { x: 0.5, y: 0.5 },
    hitbox: { width: 14, height: 14, offsetX: 0, offsetY: 0 },
    palette: ['#21102F', '#6B3A22', '#C43B3B', '#FF4F64', '#FFB33D', '#FFD27A', '#FFF0D2'],
    source: source('黄金フライ弾 dense golden fry bundle'),
    license: SHARED_LICENSE,
    processingHistory: SHARED_HISTORY,
    subject: '黄金フライ弾',
    humanDecision: 'PASS 2026-09-10',
  },
  {
    id: 'pixel.boss.kingBurger.idle',
    textureKey: TextureKey.bossKingBurgerMini,
    role: 'boss',
    northStar: true,
    humanGate: 'approved',
    replacesPlaceholder: true,
    rawSourcePath: 'assets-src/raw/chatgpt-2026-09-10/boss_king_burger.png',
    rawSourceWidth: 1448,
    rawSourceHeight: 1086,
    rawSha256: 'e86beec0ee26fa9ce57f4255b0a58a7a1d8c45daec591ead54d9dc61e94d88c5',
    masterPath: 'assets-src/masters/bosses/boss_king_burger_idle.png',
    processedPath: 'assets-src/processed/bosses/boss_king_burger_idle.png',
    runtimePath: 'assets/sprites/bosses/king_burger_mini.png',
    runtimeWidth: 96,
    runtimeHeight: 72,
    masterWidth: 384,
    masterHeight: 288,
    frameCount: 1,
    pivot: { x: 0.5, y: 0.5 },
    hitbox: { width: 81.6, height: 61.2, offsetX: 7.2, offsetY: 5.4 },
    palette: [
      '#21102F',
      '#6B3A22',
      '#7CB342',
      '#9D93B5',
      '#C43B3B',
      '#FF4F64',
      '#FF71C8',
      '#FFB33D',
      '#FFD27A',
      '#FFF0D2',
    ],
    source: source('KING BURGER crowned multi-layer burger boss'),
    license: SHARED_LICENSE,
    processingHistory: SHARED_HISTORY,
    subject: 'KING BURGER',
    humanDecision: 'PASS 2026-09-10',
  },
] as const satisfies readonly PixelAssetRecord[];

export type NorthStarAssetId = (typeof NORTH_STAR_ASSETS)[number]['id'];

export function getNorthStarAssetByTextureKey(textureKey: string): PixelAssetRecord | undefined {
  return NORTH_STAR_ASSETS.find((a) => a.textureKey === textureKey);
}

/** Phaser load path relative to BASE_URL (no leading slash). */
export function runtimeLoadPath(asset: PixelAssetRecord): string {
  return asset.runtimePath;
}
