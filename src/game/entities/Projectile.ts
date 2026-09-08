import Phaser from 'phaser';

export type ProjectileKind = 'player' | 'enemy';

export type ProjectilePayload = {
  kind: ProjectileKind;
  damage: number;
  calorie: number;
  bulletId: string;
};

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
  sprite.setVelocity(velocityX, velocityY);
  sprite.setData('payload', payload);
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
