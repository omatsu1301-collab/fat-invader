import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config';
import { accuracy } from '../domain/run-state';
import type { RunState } from '../domain/run-state';
import type { Rank } from '../domain/evaluation';

const COLOR_MILK_CREAM = '#FFF0D2';
const COLOR_UI_MUTED = '#9D93B5';
const COLOR_BURN_LIME = '#B9FF4A';
const COLOR_DANGER_CORAL = '#FF4F64';
const COLOR_PLAYER_CYAN = '#53F6FF';

export type ResultSceneData = {
  runState: RunState;
  evaluationScore: number | null;
  rank: Rank | null;
  isNewHighScore: boolean;
};

/**
 * FI-02 section 12 / FI-08 section 8: shows stats, a placeholder Appearance
 * label (>= 3 tiers per Milestone A scope), and Retry/Title — the only two
 * actions v0.1 wires up (FI-03 section 2.8).
 */
export class ResultScene extends Phaser.Scene {
  private resultData!: ResultSceneData;
  private keyboardKeys: Phaser.Input.Keyboard.Key[] = [];
  private onConfirm: (() => void) | null = null;

  constructor() {
    super('ResultScene');
  }

  init(data: ResultSceneData): void {
    this.resultData = data;
  }

  create(): void {
    this.registry.set('currentScene', 'ResultScene');
    this.cameras.main.setBackgroundColor('#090615');

    const { runState, evaluationScore, rank, isNewHighScore } = this.resultData;
    const isClear = runState.endReason === 'CLEAR';

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.12, isClear ? 'RUN CLEAR' : 'FAT OVER', {
        fontFamily: 'monospace',
        fontSize: '28px',
        fontStyle: 'bold',
        color: isClear ? COLOR_BURN_LIME : COLOR_DANGER_CORAL,
      })
      .setOrigin(0.5);

    if (!isClear) {
      this.add
        .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.18, '満腹につき、いったん帰還。', {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: COLOR_MILK_CREAM,
        })
        .setOrigin(0.5);
    }

    const acc = Math.min(100, Math.round(accuracy(runState) * 100));
    const stats = [
      `SCORE ${runState.score}`,
      `MAX COMBO ${runState.maxCombo}`,
      `ACCURACY ${acc}%`,
      `FINAL CALORIE ${runState.calorie}`,
    ];
    if (rank && evaluationScore !== null) {
      stats.push(`RANK ${rank} (${evaluationScore})`);
    }

    this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.32, stats.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: COLOR_MILK_CREAM,
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    if (isNewHighScore) {
      this.add
        .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.5, 'NEW HIGH SCORE', {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: COLOR_BURN_LIME,
        })
        .setOrigin(0.5);
    }

    if (rank) {
      const appearance = appearancePlaceholder(rank);
      this.add
        .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.58, appearance, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: COLOR_UI_MUTED,
          align: 'center',
          wordWrap: { width: LOGICAL_WIDTH - 48 },
        })
        .setOrigin(0.5);
    }

    const retryText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.74, 'RETRY', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: COLOR_BURN_LIME,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const titleText = this.add
      .text(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT * 0.82, 'TITLE', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: COLOR_PLAYER_CYAN,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    let confirmed = false;
    const onConfirm = (): void => {
      if (confirmed) return;
      confirmed = true;
      this.scene.start('GameScene');
    };
    this.onConfirm = onConfirm;

    retryText.on('pointerdown', onConfirm);
    titleText.on('pointerdown', () => {
      if (confirmed) return;
      confirmed = true;
      this.scene.start('TitleScene');
    });

    const keyboard = this.input.keyboard;
    if (keyboard) {
      const spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      const enterKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      spaceKey.on('down', onConfirm);
      enterKey.on('down', onConfirm);
      this.keyboardKeys = [spaceKey, enterKey];
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private handleShutdown(): void {
    if (this.onConfirm) {
      for (const key of this.keyboardKeys) {
        key.off('down', this.onConfirm);
      }
    }
    this.time.removeAllEvents();
  }
}

function appearancePlaceholder(rank: Rank): string {
  switch (rank) {
    case 'D':
      return '普通サイズで堂々と帰還した。';
    case 'C':
      return '少し汗をかいただけだ。まだ余裕がある。';
    case 'B':
      return '心なしか、少し引き締まった。';
    case 'A':
      return '採点文化は黙っていない。今日の体は「A」。';
    case 'S':
      return '広告コピーが勝手に貼られる体型になった。';
    case 'SS':
      return 'BODY FAT 3% — WARNING';
  }
}
