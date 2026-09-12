import Phaser from 'phaser';
import { DisplayDepth } from '../config/display';
import { powerups, type PowerUpId } from '../content/powerups';
import { GameBalance } from '../config/balance';

export type PowerUpRuntimeData = {
  powerUpId: PowerUpId;
};

const TEXTURE: Record<PowerUpId, string> = {
  protein: powerups.protein.textureKey,
  caffeine: powerups.caffeine.textureKey,
  cardio: powerups.cardio.textureKey,
  fatBurn: powerups.fatBurn.textureKey,
  cheatDay: powerups.cheatDay.textureKey,
};

export function spawnPowerUp(
  group: Phaser.Physics.Arcade.Group,
  powerUpId: PowerUpId,
  x: number,
  y: number,
): Phaser.Physics.Arcade.Sprite | null {
  if (countActivePowerUps(group) >= GameBalance.powerup.maxOnScreen) return null;
  const sprite = group.get(x, y, TEXTURE[powerUpId]) as Phaser.Physics.Arcade.Sprite | null;
  if (!sprite) return null;
  sprite.setActive(true);
  sprite.setVisible(true);
  sprite.setPosition(x, y);
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.enable = true;
  body.reset(x, y);
  body.setSize(20, 20);
  body.setOffset(2, 2);
  sprite.setVelocity(0, 40);
  sprite.setData('powerup', { powerUpId } satisfies PowerUpRuntimeData);
  sprite.setDepth(DisplayDepth.actor);
  return sprite;
}

export function deactivatePowerUp(sprite: Phaser.Physics.Arcade.Sprite): void {
  sprite.setActive(false);
  sprite.setVisible(false);
  const body = sprite.body as Phaser.Physics.Arcade.Body | null;
  if (body) body.enable = false;
  sprite.setVelocity(0, 0);
  sprite.setData('powerup', undefined);
}

export function countActivePowerUps(group: Phaser.Physics.Arcade.Group): number {
  let n = 0;
  for (const child of group.children) {
    if ((child as Phaser.Physics.Arcade.Sprite).active) n += 1;
  }
  return n;
}

export function powerUpLabel(powerUpId: PowerUpId): string {
  const def = powerups[powerUpId];
  if (powerUpId === 'cheatDay') return `${def.label} CAL+${def.calorieCost}`;
  return def.label;
}
