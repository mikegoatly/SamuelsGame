import { ACTIVE_HAZARD_KINDS, type ActiveHazardKind } from './kinds';

/** Per kind, how many instances (or intensity for rubble, wind and sandstorm) each combat room gets; index 0 is room 1. */
export type HazardPlan = Partial<Record<ActiveHazardKind, readonly number[]>>;

export interface BossHazard {
  kind: ActiveHazardKind;
  count: number;
}

export const hazardCount = (plan: HazardPlan, kind: ActiveHazardKind, room: number): number => plan[kind]?.[room - 1] ?? 0;

export const roomKinds = (plan: HazardPlan, room: number): ActiveHazardKind[] => ACTIVE_HAZARD_KINDS.filter((kind) => hazardCount(plan, kind, room) > 0);

export const roomLoad = (plan: HazardPlan, room: number): number => ACTIVE_HAZARD_KINDS.reduce((sum, kind) => sum + hazardCount(plan, kind, room), 0);

const firstRoom = (plan: HazardPlan, kind: ActiveHazardKind): number => (plan[kind]?.findIndex((n) => n > 0) ?? -1) + 1;

/** Kinds that appear in the plan, ordered by the room they first show up in. */
export function introductionOrder(plan: HazardPlan): ActiveHazardKind[] {
  return ACTIVE_HAZARD_KINDS.filter((kind) => firstRoom(plan, kind) > 0).sort((a, b) => firstRoom(plan, a) - firstRoom(plan, b));
}
