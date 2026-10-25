export type Edge = 'rose' | 'fell' | 'none';

/** Turns a per-frame on/off flag (dashing) into the frame it starts and the frame it ends. */
export class EdgeWatch {
  private last = false;

  step(on: boolean): Edge {
    const edge: Edge = on === this.last ? 'none' : on ? 'rose' : 'fell';
    this.last = on;
    return edge;
  }
}
