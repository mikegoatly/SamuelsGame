export interface PackShape {
  count: readonly [min: number, max: number];
  leader?: boolean;
}

/** Groups at least this big get a wider berth from the player and a bigger marker. */
export const BIG_GROUP = 4;
const BIG_GROUP_EXTRA_DISTANCE = 60;
const PACK_SPREAD = 26;

/** Monsters a spawn brings on average: singles 1, twins 2, a pack its mean member count (rounded up) plus its leader. */
export function expectedGroupSize(pack: PackShape | undefined, twins = false): number {
  if (!pack) return 1;
  if (twins) return 2;
  return Math.ceil((pack.count[0] + pack.count[1]) / 2) + (pack.leader ? 1 : 0);
}

export const spawnDistanceFor = (size: number, base: number): number => (size >= BIG_GROUP ? base + BIG_GROUP_EXTRA_DISTANCE : base);

/** Extra marker radius so a pack's ring covers the area it scatters over. */
export const markerSpread = (size: number): number => (size > 1 ? PACK_SPREAD : 0);

/** The room may clear (or wake statues) once every wave is out and no arrival is still telegraphed. */
export const roomReady = (allReleased: boolean, pendingMarkers: number): boolean => allReleased && pendingMarkers === 0;
