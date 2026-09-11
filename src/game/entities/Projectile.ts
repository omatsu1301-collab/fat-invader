import Phaser from 'phaser';
import { DisplayDepth } from '../config/display';

export type ProjectileKind = 'player' | 'enemy';

export type ProjectilePayload = {
  kind: ProjectileKind;
  damage: number;
  calorie: number;
  bulletId: string;
};

/** Explicit Arcade body by bullet id. Visual canvas may differ (AC-117 / FI-10). */
export function projectileBodyForBulletId(bulletId: string): {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
} {
  if (bulletId === 'playerShot') {
    // Visual canvas 12×16; collision remains 6×16 centered horizontally.
    return { width: 6, height: 16, offsetX: 3, offsetY: 0 };
  }
  if (bulletId === 'fry') {
    return { width: 14, height: 14, offsetX: 0, offsetY: 0 };
  }
  if (bulletId === 'donut') {
    return { width: 12, height: 12, offsetX: 2, offsetY: 2 };
  }
  if (bulletId === 'pizzaSlice') {
    return { width: 12, height: 12, offsetX: 2, offsetY: 2 };
  }
  if (bulletId === 'tapioca') {
    return { width: 8, height: 8, offsetX: 1, offsetY: 1 };
  }
  if (bulletId === 'cake') {
    return { width: 18, height: 18, offsetX: 2, offsetY: 2 };
  }
  if (bulletId === 'sodaLaser') {
    return { width: 14, height: 14, offsetX: 2, offsetY: 2 };
  }
  return { width: 12, height: 12, offsetX: 0, offsetY: 0 };
}

/** Optional sine drift for DONUT bullets (display path follows gameplay velocity X). */
export function updateSineProjectiles(group: Phaser.Physics.Arcade.Group, nowMs: number): void {
  for (const child of group.children) {
    const sprite = child as Phaser.Physics.Arcade.Sprite;
    if (!sprite.active) continue;
    const sine = sprite.getData('sine') as
      | { originX: number; amplitude: number; periodMs: number; bornAtMs: number; baseVx: number }
      | undefined;
    if (!sine) continue;
    const t = nowMs - sine.bornAtMs;
    const offset = Math.sin((t / sine.periodMs) * Math.PI * 2) * sine.amplitude;
    sprite.x = sine.originX + offset + sine.baseVx * (t / 1000);
  }
}

/**
 * Fires (or reuses, via the group's own pooling) one projectile. Arcade
 * Groups created with a `maxSize` silently no-op past capacity, which is the
 * desired cap-aware behavior from FI-05 section 9 rather than an error.
 */
export function fireProjectile(
  group: Phaser.Physics.Arcade.Group,
  textureKey: string,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  payload: ProjectilePayload,
): Phaser.Physics.Arcade.Sprite | null {
  const sprite = group.get(x, y, textureKey) as Phaser.Physics.Arcade.Sprite | null;
  if (!sprite) return null;

  sprite.setActive(true);
  sprite.setVisible(true);
  sprite.setPosition(x, y);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.enable = true;
  body.reset(x, y);
  const box = projectileBodyForBulletId(payload.bulletId);
  body.setSize(box.width, box.height);
  body.setOffset(box.offsetX, box.offsetY);
  sprite.setVelocity(velocityX, velocityY);
  sprite.setData('payload', payload);
  sprite.setDepth(payload.kind === 'enemy' ? DisplayDepth.enemyBullet : DisplayDepth.playerBullet);
  return sprite;
}

export function deactivateProjectile(sprite: Phaser.Physics.Arcade.Sprite): void {
  sprite.setActive(false);
  sprite.setVisible(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
  sprite.setVelocity(0, 0);
}

const OFFSCREEN_MARGIN = 32;

/** Sweeps a projectile group and deactivates anything that left the playfield. */
export function despawnOffscreen(
  group: Phaser.Physics.Arcade.Group,
  playfieldHeight: number,
  onDespawn?: (sprite: Phaser.Physics.Arcade.Sprite) => void,
): void {
  for (const child of group.children) {
    const sprite = child as Phaser.Physics.Arcade.Sprite;
    if (!sprite.active) continue;
    if (
      sprite.y < -OFFSCREEN_MARGIN ||
      sprite.y > playfieldHeight + OFFSCREEN_MARGIN ||
      sprite.x < -OFFSCREEN_MARGIN ||
      sprite.x > sprite.scene.scale.width + OFFSCREEN_MARGIN
    ) {
      onDespawn?.(sprite);
      deactivateProjectile(sprite);
    }
  }
}
