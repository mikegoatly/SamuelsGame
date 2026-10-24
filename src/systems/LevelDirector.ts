/** Drives the enemies of a level (arena waves or ruins rooms) and reports progress for the HUD and game-over text. */
export interface LevelDirector {
  start(): void;
  stop(): void;
  progressLabel(): string;
}
