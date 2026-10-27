/** Drives the enemies of a level (arena waves or ruins rooms) and reports progress for the HUD and game-over text. */
export interface LevelDirector {
  start(): void;
  stop(): void;
  progressLabel(): string;
  /** 0..1 progress of the countdown to the next wave; undefined when none is pending. */
  readonly nextWaveProgress?: number;
  /** Survival only: time survived so far in ms, on the game clock. */
  readonly elapsedMs?: number;
  /** Waves started so far (arena and survival). */
  readonly wave?: number;
}
