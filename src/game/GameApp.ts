import Phaser from 'phaser';
import { installE2EBridge } from '../test-support/e2e-bridge';
import { createGameConfig } from './config';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

export function createGameApp(): Phaser.Game {
  const game = new Phaser.Game(
    createGameConfig([BootScene, TitleScene, GameScene, ResultScene]),
  );
  installE2EBridge(game);
  return game;
}
