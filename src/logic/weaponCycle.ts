/** The owned weapon `direction` steps from `current`, wrapping; an unknown current weapon goes to the first owned one. */
export function nextWeapon(owned: readonly string[], current: string, direction: 1 | -1): string {
  if (owned.length === 0) return current;
  const index = owned.indexOf(current);
  if (index < 0) return owned[0]!;
  return owned[(index + direction + owned.length) % owned.length]!;
}
