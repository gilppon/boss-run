import { BOSS_FORMS, FACILITIES, FLOORS, MAX_FACILITY_LEVEL, MAX_TRAP_LEVEL, TRAP_DEFS } from "./config";
import type {
  BossStats,
  RewardBreakdown,
  RunConfig,
  RunResult,
  SaveData,
  TrapStats,
  TrapType,
} from "./types";
import { TRAP_TYPES } from "./types";

export function trapStats(type: TrapType, level: number): TrapStats {
  const d = TRAP_DEFS[type];
  const l = Math.max(level, 1);
  const s: TrapStats = {
    unlocked: level > 0,
    level,
    cost: d.baseCost,
    damage: d.baseDamage + d.dmgPerLevel * (l - 1),
    hp: 1,
    fireInterval: 2.4,
    spiked: false,
  };
  if (type === "Minion") {
    s.hp = 1 + Math.floor((l - 1) / 2);
    s.fireInterval = 2.4 - 0.25 * (l - 1);
    s.spiked = l >= 3;
  }
  return s;
}

/** Cost of the next level-up (or unlock). null at max level */
export function trapUpgradeCost(type: TrapType, level: number): number | null {
  if (level >= MAX_TRAP_LEVEL) return null;
  const d = TRAP_DEFS[type];
  if (level === 0) return d.unlockCost;
  return Math.round(d.upgradeBase * Math.pow(1.7, level - 1));
}

export function facilityCost(key: "mine" | "well" | "vault", level: number): number | null {
  if (level >= MAX_FACILITY_LEVEL) return null;
  const f = FACILITIES.find((x) => x.key === key)!;
  return Math.round(f.baseCost * Math.pow(f.growth, level));
}

export function bossStats(save: SaveData): BossStats {
  const def = BOSS_FORMS[save.bossForm] ?? BOSS_FORMS[0];
  const well = save.facilities.well;
  return {
    form: save.bossForm,
    def,
    maxHp: def.maxHp,
    maxMana: def.maxMana + 12 * well,
    manaRegen: def.manaRegen + 1.2 * well,
    speed: def.speed,
    roarPower: def.roarPower,
    roarCooldown: def.roarCooldown,
    scale: def.scale,
  };
}

export function buildRunConfig(save: SaveData, floorIndex: number): RunConfig {
  const traps = {} as Record<TrapType, TrapStats>;
  for (const t of TRAP_TYPES) traps[t] = trapStats(t, save.trapLevels[t]);
  return {
    floorIndex,
    floor: FLOORS[floorIndex],
    boss: bossStats(save),
    traps,
  };
}

export function computeReward(save: SaveData, floorIndex: number, r: RunResult): RewardBreakdown {
  const floor = FLOORS[floorIndex];
  let base: number;
  let bonus: number;
  if (r.won) {
    base = floor.reward;
    bonus = Math.round(floor.reward * 0.6 * r.bossHpPct);
  } else {
    base = Math.round(floor.reward * 0.5 * r.heroDamagePct);
    bonus = Math.round(floor.reward * 0.15 * r.distancePct);
  }
  const vaultPct = save.facilities.vault * 12;
  let total = Math.round((base + bonus) * (1 + vaultPct / 100));
  if (!r.won) total = Math.max(total, 3);
  return { base, bonus, vaultPct, total };
}

export const MINE_RATE = 0.6; // gems per minute per level
export const MINE_CAP_MIN = 480; // stores up to 8 hours (a reason to come back)

export function pendingMine(save: SaveData, now: number): number {
  const lvl = save.facilities.mine;
  if (lvl <= 0) return 0;
  const minutes = Math.min((now - save.lastCollect) / 60000, MINE_CAP_MIN);
  return Math.max(0, Math.floor(minutes * MINE_RATE * lvl));
}

// ---- purchase / mutation helpers (immutable updates) ----

export function applyRunEnd(save: SaveData, floorIndex: number, r: RunResult, reward: number): SaveData {
  return {
    ...save,
    gems: save.gems + reward,
    totalEarned: save.totalEarned + reward,
    cleared: r.won ? Math.max(save.cleared, floorIndex + 1) : save.cleared,
    stats: {
      runs: save.stats.runs + 1,
      wins: save.stats.wins + (r.won ? 1 : 0),
      heroesDefeated: save.stats.heroesDefeated + (r.won ? 1 : 0),
    },
  };
}

export function addGems(save: SaveData, amount: number): SaveData {
  return { ...save, gems: save.gems + amount, totalEarned: save.totalEarned + amount };
}

export function buyTrap(save: SaveData, type: TrapType): SaveData | null {
  const lvl = save.trapLevels[type];
  const cost = trapUpgradeCost(type, lvl);
  if (cost === null || save.gems < cost) return null;
  return { ...save, gems: save.gems - cost, trapLevels: { ...save.trapLevels, [type]: lvl + 1 } };
}

export function buyForm(save: SaveData): SaveData | null {
  const next = save.bossForm + 1;
  if (next >= BOSS_FORMS.length) return null;
  const cost = BOSS_FORMS[next].cost;
  if (save.gems < cost) return null;
  return { ...save, gems: save.gems - cost, bossForm: next };
}

export function buyFacility(save: SaveData, key: "mine" | "well" | "vault"): SaveData | null {
  const lvl = save.facilities[key];
  const cost = facilityCost(key, lvl);
  if (cost === null || save.gems < cost) return null;
  const next: SaveData = {
    ...save,
    gems: save.gems - cost,
    facilities: { ...save.facilities, [key]: lvl + 1 },
  };
  // mining starts accruing the moment the mine is first built
  if (key === "mine" && lvl === 0) next.lastCollect = Date.now();
  return next;
}

export function collectMine(save: SaveData, now: number): { save: SaveData; amount: number } {
  const amount = pendingMine(save, now);
  if (amount <= 0) return { save, amount: 0 };
  return { save: { ...addGems(save, amount), lastCollect: now }, amount };
}

// ---- daily reward (7-day cycle, consecutive check-ins based on local midnight) ----
export const DAILY_REWARDS = [30, 40, 55, 70, 90, 120, 200];

function dayKey(t: number): string {
  return new Date(t).toDateString();
}

export function dailyStatus(
  save: SaveData,
  now: number,
): { available: boolean; streakDay: number; amount: number } {
  const claimedToday = save.lastDaily > 0 && dayKey(save.lastDaily) === dayKey(now);
  if (claimedToday) {
    const day = Math.min(save.dailyStreak, 7);
    return { available: false, streakDay: day, amount: DAILY_REWARDS[day - 1] ?? DAILY_REWARDS[0] };
  }
  const yesterday = dayKey(now - 86400000);
  const continued = save.lastDaily > 0 && dayKey(save.lastDaily) === yesterday;
  const next = continued ? (save.dailyStreak % 7) + 1 : 1;
  return { available: true, streakDay: next, amount: DAILY_REWARDS[next - 1] };
}

export function claimDaily(save: SaveData, now: number): { save: SaveData; amount: number } {
  const st = dailyStatus(save, now);
  if (!st.available) return { save, amount: 0 };
  const next: SaveData = {
    ...addGems(save, st.amount),
    lastDaily: now,
    dailyStreak: st.streakDay,
  };
  return { save: next, amount: st.amount };
}
