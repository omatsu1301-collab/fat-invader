import type Phaser from 'phaser';

export type FatE2ESnapshot = {
  sceneKey: string;
  startPressCount: number;
};

export type FatE2EBridge = {
  getSnapshot: () => FatE2ESnapshot;
};

declare global {
  interface Window {
    __FAT_E2E__?: FatE2EBridge;
  }
}

/**
 * Exposes a minimal read-only snapshot for Playwright assertions.
 * Only installed when VITE_E2E=1, so production builds never carry it.
 */
export function installE2EBridge(game: Phaser.Game): void {
  if (import.meta.env.VITE_E2E !== '1') {
    return;
  }

  window.__FAT_E2E__ = {
    getSnapshot: () => ({
      sceneKey: (game.registry.get('currentScene') as string | undefined) ?? 'unknown',
      startPressCount: (game.registry.get('startPressCount') as number | undefined) ?? 0,
    }),
  };
}
