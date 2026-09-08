/** FI-05 section 10: background, gameplay, VFX, HUD depth ranges. */
export const DisplayDepth = {
  background: 0,
  actor: 2,
  playerBullet: 3,
  vfx: 4,
  enemyBullet: 5,
  popup: 8,
  hud: 10,
  callout: 12,
  caption: 20,
  pause: 30,
} as const;
