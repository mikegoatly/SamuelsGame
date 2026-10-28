/** Fires when something steps onto a spot, then stays quiet until it has stepped off and on again. `canFire` false (a modal is up, the run ended) holds the step until it is true. */
export class StepOnTrigger {
  private armed = true;

  step(inside: boolean, canFire: boolean): boolean {
    if (!inside) {
      this.armed = true;
      return false;
    }
    if (!this.armed || !canFire) return false;
    this.armed = false;
    return true;
  }
}
