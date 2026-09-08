import Phaser from 'phaser';

export const LOGICAL_WIDTH = 390;
export const LOGICAL_HEIGHT = 844;

export function createGameConfig(
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#090615',
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false,
      },
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
    scene: scenes,
  };
}
