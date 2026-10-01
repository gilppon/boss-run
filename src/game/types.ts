export type TrapType = "Lava" | "Spike" | "Minion";
export const TRAP_TYPES: TrapType[] = ["Lava", "Spike", "Minion"];

/** Data shapes from the design doc */
export interface HeroHeroAI {
  x: number;
  y: number;
  speed: number;
  health: number;
  targetDistance: number;
}

export interface BossTrap {
  id: string;
  type: TrapType;
  x: number;
  y: number;
  damage: number;
}

export interface TrapStats {
  unlocked: boolean;
  level: number;
  cost: number;
  damage: number;
  hp: number;
  fireInterval: number;
  spiked: boolean;
}

export interface BossFormDef {
  name: string;
  title: string;
  desc: string;
  cost: number;
  maxHp: number;
  maxMana: number;
  manaRegen: number;
  speed: number;
  roarPower: number;
  roarCooldown: number;
  scale: number;
  palette: { body: number; belly: number; horn: number; eye: number; accent: number };
  wings: boolean;
  crown: boolean;
  aura: boolean;
}

export interface BossStats {
  form: number;
  def: BossFormDef;
  maxHp: number;
  maxMana: number;
  manaRegen: number;
  speed: number;
  roarPower: number;
  roarCooldown: number;
  scale: number;
}

export interface FloorDef {
  id: number;
  name: string;
  sub: string;
  desc: string;
  length: number;
  heroName: string;
  heroHp: number;
  heroSpeed: number;
  heroJump: number;
  heroSkill: number; // 0~1 jump timing accuracy
  heroDodge: number; // chance to dodge a falling drop spike
  heroBlunder: number; // chance of a big mistake
  contactDamage: number;
  reward: number;
  accent: string;
}

export interface RunConfig {
  floorIndex: number;
  floor: FloorDef;
  boss: BossStats;
  traps: Record<TrapType, TrapStats>;
  heroHpScale?: number; // revive: hero HP multiplier (default 1)
}

export type EndReason = "hero-defeated" | "boss-defeated" | "exit-reached";

export interface RunResult {
  won: boolean;
  reason: EndReason;
  time: number;
  distancePct: number;
  heroDamagePct: number;
  bossHpPct: number;
  trapsPlaced: number;
  minionKills: number;
  trapHits: number;
}

export interface RewardBreakdown {
  base: number;
  bonus: number;
  vaultPct: number;
  total: number;
}

export interface HudState {
  bossHp: number;
  bossMaxHp: number;
  heroHp: number;
  heroMaxHp: number;
  heroName: string;
  mana: number;
  maxMana: number;
  bossProgress: number;
  heroProgress: number;
  gap: number;
  roarCd: number;
  roarMax: number;
  selected: TrapType;
  time: number;
  started: boolean;
  combo: number;
  trapsPlaced: number;
}

export interface SaveData {
  gems: number;
  totalEarned: number;
  trapLevels: Record<TrapType, number>;
  bossForm: number;
  cleared: number; // highest floor index cleared in a row
  selectedFloor: number;
  facilities: { mine: number; well: number; vault: number };
  lastCollect: number;
  stats: { runs: number; wins: number; heroesDefeated: number };
  soundOn: boolean;
  seenTutorial: boolean;
  lowFx: boolean; // low-spec fx mode
  lastDaily: number; // timestamp of the last daily reward claim
  dailyStreak: number; // consecutive days checked in (1~7 cycle)
}
