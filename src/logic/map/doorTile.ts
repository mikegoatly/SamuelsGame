/** Iron-bar doors come from the Roguelike sheet (the sewer); Glitch lists that sheet for its sewer-look rooms but keeps the normal doors. */
export const usesBarDoors = (environment: string, hasRogueTileset: boolean): boolean => hasRogueTileset && environment !== 'glitch';
