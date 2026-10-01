export type TrapType = "Lava" | "Spike" | "Minion";
export const TRAP_TYPES: TrapType[] = ["Lava", "Spike", "Minion"];

/** 기획서의 데이터 구조 */
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
  heroSkill: number; // 0~1 점프 타이밍 정확도
  heroDodge: number; // 낙하 가시 회피 확률
  heroBlunder: number; // 큰 실수 확률
  contactDamage: number;
  reward: number;
  accent: string;
}

export interface RunConfig {
  floorIndex: number;
  floor: FloorDef;
  boss: BossStats;
  traps: Record<TrapType, TrapStats>;
  heroHpScale?: number; // 부활용: 용사 체력 배율 (기본 1)
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
  cleared: number; // 연속으로 클리어한 층 수
  selectedFloor: number;
  facilities: { mine: number; well: number; vault: number };
  lastCollect: number;
  stats: { runs: number; wins: number; heroesDefeated: number };
  soundOn: boolean;
  seenTutorial: boolean;
  lowFx: boolean; // 저사양 이펙트 모드
  lastDaily: number; // 일일보상 마지막 수령 시각
  dailyStreak: number; // 연속 출석 일수 (1~7 사이클)
}
