import Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { createGameConfig, LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../../src/game/config';

// Phaser touches a real canvas 2D context at module init for renderer feature
// detection, which jsdom cannot provide without the native `canvas` package.
// Config shape is pure data, so the module is mocked here; real rendering is
// covered by the Playwright smoke test instead.
vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Scale: { FIT: 'FIT', CENTER_BOTH: 'CENTER_BOTH' },
  },
}));

describe('createGameConfig', () => {
  it('fixes the logical resolution defined by FI-02 section 3', () => {
    const config = createGameConfig([]);
    expect(config.width).toBe(LOGICAL_WIDTH);
    expect(config.height).toBe(LOGICAL_HEIGHT);
  });

  it('uses FIT scaling with centered auto-center per FI-05 section 10', () => {
    const config = createGameConfig([]);
    expect(config.scale?.mode).toBe(Phaser.Scale.FIT);
    expect(config.scale?.autoCenter).toBe(Phaser.Scale.CENTER_BOTH);
  });

  it('configures Arcade Physics as the sole physics engine per FI-05 section 6.2', () => {
    const config = createGameConfig([]);
    expect(config.physics?.default).toBe('arcade');
  });

  it('passes through the provided scene list without mutation', () => {
    const scenes = [{ key: 'Probe' }] as unknown as Phaser.Types.Scenes.SceneType[];
    const config = createGameConfig(scenes);
    expect(config.scene).toBe(scenes);
  });
});
