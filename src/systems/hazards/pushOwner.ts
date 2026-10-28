/** Who set the player's wind/flush push, so a hazard only ever clears a push it set itself. */
const owners = new WeakMap<object, object>();

export interface Pushable {
  windPush: { x: number; y: number };
}

export function claimPush(player: Pushable, owner: object, push: { x: number; y: number }): void {
  owners.set(player, owner);
  player.windPush = push;
}

export function releasePush(player: Pushable, owner: object): void {
  if (owners.get(player) !== owner) return;
  owners.delete(player);
  player.windPush = { x: 0, y: 0 };
}
