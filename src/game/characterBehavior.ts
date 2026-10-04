const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Chance to pause and brace when a ceiling spike begins to fall. */
export function spikeReactionChance(baseChance: number, profileBonus: number): number {
  return clamp(baseChance + profileBonus, 0, 0.85);
}

/** Chance to choose a stomp against a single, unspiked minion. */
export function minionStompChance(skill: number, profileBonus: number): number {
  return clamp(0.3 + skill * 0.5 + profileBonus, 0.05, 0.9);
}
