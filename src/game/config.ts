import type { BossFormDef, FloorDef, TrapType } from "./types";

export interface TrapDef {
  name: string;
  short: string;
  icon: string;
  color: string;
  hotkey: string;
  desc: string;
  baseCost: number; // mana cost
  baseDamage: number;
  dmgPerLevel: number;
  unlockCost: number; // dark gems
  upgradeBase: number; // dark gems
}

export const TRAP_DEFS: Record<TrapType, TrapDef> = {
  Lava: {
    name: "Lava Pit",
    short: "Lava",
    icon: "🌋",
    color: "#ff6a1f",
    hotkey: "1",
    desc: "Pours lava on the floor. The wider you drag, the harder the hero jumps it.",
    baseCost: 22,
    baseDamage: 24,
    dmgPerLevel: 8,
    unlockCost: 0,
    upgradeBase: 60,
  },
  Spike: {
    name: "Drop Spikes",
    short: "Spikes",
    icon: "🗡️",
    color: "#cbd5e1",
    hotkey: "2",
    desc: "Hangs from the ceiling and drops when the hero closes in. Hurts, and stuns.",
    baseCost: 16,
    baseDamage: 22,
    dmgPerLevel: 7,
    unlockCost: 0,
    upgradeBase: 70,
  },
  Minion: {
    name: "Flame Minion",
    short: "Minion",
    icon: "👺",
    color: "#f43f5e",
    hotkey: "3",
    desc: "A minion that spits fire. Step on it and it dies, but from Lv.3 the spiked helm bites stompers too.",
    baseCost: 30,
    baseDamage: 9,
    dmgPerLevel: 3,
    unlockCost: 180,
    upgradeBase: 90,
  },
};

export const BOSS_FORMS: BossFormDef[] = [
  {
    name: "Lil' Demon",
    title: "Imp Lord",
    desc: "Still a cute beginner demon. Plenty fast enough to run.",
    cost: 0,
    maxHp: 100,
    maxMana: 100,
    manaRegen: 9,
    speed: 250,
    roarPower: 1,
    roarCooldown: 14,
    scale: 1,
    palette: { body: 0xc0313f, belly: 0xf3b98c, horn: 0xf5e6c8, eye: 0xffe14d, accent: 0x7a1524 },
    wings: false,
    crown: false,
    aura: false,
  },
  {
    name: "Hell King",
    title: "Hellfire Baron",
    desc: "Grows a size. More HP, faster mana.",
    cost: 350,
    maxHp: 145,
    maxMana: 120,
    manaRegen: 11,
    speed: 256,
    roarPower: 1.2,
    roarCooldown: 12.5,
    scale: 1.14,
    palette: { body: 0x8a2fb0, belly: 0xe7a6c9, horn: 0xffd9a0, eye: 0x7dfcff, accent: 0x4a1266 },
    wings: false,
    crown: false,
    aura: false,
  },
  {
    name: "Abyss Lord",
    title: "Abyss Sovereign",
    desc: "Bat wings sprout. Your roar shoves the hero further.",
    cost: 1000,
    maxHp: 195,
    maxMana: 145,
    manaRegen: 13.5,
    speed: 263,
    roarPower: 1.45,
    roarCooldown: 11,
    scale: 1.28,
    palette: { body: 0x2f4bc4, belly: 0xbfd0ff, horn: 0xe2e8f0, eye: 0xff5ad9, accent: 0x172554 },
    wings: true,
    crown: false,
    aura: false,
  },
  {
    name: "Last Emperor",
    title: "Doom Emperor",
    desc: "Crown and hellfire aura. The final form. The whole dungeon shakes.",
    cost: 2600,
    maxHp: 270,
    maxMana: 185,
    manaRegen: 17,
    speed: 272,
    roarPower: 1.8,
    roarCooldown: 9,
    scale: 1.42,
    palette: { body: 0x22222e, belly: 0xff9a3d, horn: 0xffe27a, eye: 0xff2d2d, accent: 0x0b0b12 },
    wings: true,
    crown: true,
    aura: true,
  },
];

export const FLOORS: FloorDef[] = [
  {
    id: 0,
    name: "Rookie's Road",
    sub: "B1",
    desc: "A rookie who just picked up a sword. Still clumsy with jumps.",
    length: 9000,
    heroName: "Rookie Hero",
    heroHp: 90,
    heroSpeed: 262,
    heroJump: 820,
    heroSkill: 0.55,
    heroDodge: 0.12,
    heroBlunder: 0.1,
    contactDamage: 20,
    reward: 45,
    accent: "#f59e0b",
  },
  {
    id: 1,
    name: "Sketchy Sewers",
    sub: "B2",
    desc: "A plumber hero weaving between green pipes. His jumps get accurate.",
    length: 10200,
    heroName: "Plumber Hero",
    heroHp: 130,
    heroSpeed: 268,
    heroJump: 835,
    heroSkill: 0.65,
    heroDodge: 0.2,
    heroBlunder: 0.08,
    contactDamage: 24,
    reward: 70,
    accent: "#22c55e",
  },
  {
    id: 2,
    name: "Ember Gallery",
    sub: "B3",
    desc: "Fire-forged. Spots spikes and even stops to think about them.",
    length: 11400,
    heroName: "Flameforged Hero",
    heroHp: 180,
    heroSpeed: 274,
    heroJump: 850,
    heroSkill: 0.75,
    heroDodge: 0.3,
    heroBlunder: 0.06,
    contactDamage: 28,
    reward: 105,
    accent: "#ef4444",
  },
  {
    id: 3,
    name: "Abyssal Halls",
    sub: "B4",
    desc: "Almost pro level. Barely clears even wide lava.",
    length: 12600,
    heroName: "Abyss Breaker",
    heroHp: 240,
    heroSpeed: 280,
    heroJump: 865,
    heroSkill: 0.84,
    heroDodge: 0.38,
    heroBlunder: 0.04,
    contactDamage: 32,
    reward: 155,
    accent: "#a855f7",
  },
  {
    id: 4,
    name: "The King's Cathedral",
    sub: "B5",
    desc: "A legendary super hero. This one needs real trap combos.",
    length: 13800,
    heroName: "Legendary Superhero",
    heroHp: 320,
    heroSpeed: 286,
    heroJump: 880,
    heroSkill: 0.92,
    heroDodge: 0.46,
    heroBlunder: 0.02,
    contactDamage: 36,
    reward: 230,
    accent: "#38bdf8",
  },
];

export interface FacilityDef {
  key: "mine" | "well" | "vault";
  name: string;
  icon: string;
  desc: string;
  perLevel: string;
  baseCost: number;
  growth: number;
}

export const FACILITIES: FacilityDef[] = [
  {
    key: "mine",
    name: "Dark Gem Mine",
    icon: "⛏️",
    desc: "Gems pile up even offline. (Stores up to 8 hours)",
    perLevel: "+0.6 gems/min",
    baseCost: 140,
    growth: 1.9,
  },
  {
    key: "well",
    name: "Mana Spring",
    icon: "🔮",
    desc: "Raises max mana and mana regen at the start of a run.",
    perLevel: "Max mana +12 / regen +1.2",
    baseCost: 110,
    growth: 1.8,
  },
  {
    key: "vault",
    name: "Castle Vault",
    icon: "💰",
    desc: "Every dark gem reward you earn goes up.",
    perLevel: "Gem reward +12%",
    baseCost: 160,
    growth: 2,
  },
];

export const MAX_FACILITY_LEVEL = 5;
export const MAX_TRAP_LEVEL = 5;
