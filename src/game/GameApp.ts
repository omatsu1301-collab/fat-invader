import Phaser from 'phaser';
import { installE2EBridge } from '../test-support/e2e-bridge';
import { createGameConfig } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';

export function createGameApp(): Phaser.Game {
  const game = new Phaser.Game(createGameConfig([BootScene, TitleScene]));
  installE2EBridge(game);
  return game;
}
