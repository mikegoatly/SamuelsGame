/** Which keyboard keys (KeyboardEvent.code) are down right now, fed from window events so paused scenes cannot miss a release. */
export class HeldKeys {
  private readonly codes = new Set<string>();
  /** Bumped each time the last held key is released. */
  releases = 0;

  down(code: string): void {
    this.codes.add(code);
  }

  up(code: string): void {
    if (this.codes.delete(code) && this.codes.size === 0) this.releases++;
  }

  clear(): void {
    if (this.codes.size > 0) this.releases++;
    this.codes.clear();
  }

  has(code: string): boolean {
    return this.codes.has(code);
  }

  any(): boolean {
    return this.codes.size > 0;
  }
}

/** Opened with a dialog: keyboard input is ignored until every key held at that moment (and any pressed since) is released. */
export class ReleaseGate {
  private readonly armed: boolean;
  private readonly mark: number;

  constructor(private readonly keys: HeldKeys) {
    this.armed = keys.any();
    this.mark = keys.releases;
  }

  ready(): boolean {
    return !this.armed || this.keys.releases > this.mark;
  }
}
