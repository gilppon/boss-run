export type DodgeAction = "jump" | "crouch";

/** Keep attack telegraphs and projectile lanes aligned with the required dodge. */
export function getHeroAttackDodgeAction(type: string, isMelee: boolean): DodgeAction {
  if (isMelee || type === "apprentice" || type === "scout") return "jump";
  return "crouch";
}
