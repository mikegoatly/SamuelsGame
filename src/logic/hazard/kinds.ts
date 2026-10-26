export const ACTIVE_HAZARD_KINDS = ['crackedFloor', 'rubble', 'gasVent', 'firePit', 'wind', 'sandstorm', 'arrowWall', 'pendulum', 'flameJet'] as const;

/** Hazards the HazardDirector runs; quicksand and spikes keep their own systems. */
export type ActiveHazardKind = (typeof ACTIVE_HAZARD_KINDS)[number];

export type HazardKind = 'quicksand' | 'spikes' | ActiveHazardKind;

export const isActiveKind = (kind: unknown): kind is ActiveHazardKind => ACTIVE_HAZARD_KINDS.includes(kind as ActiveHazardKind);
