import type { BossFormDef, FloorDef, TrapType } from "./types";

export interface TrapDef {
  name: string;
  short: string;
  icon: string;
  color: string;
  hotkey: string;
  desc: string;
  baseCost: number; // 마나 비용
  baseDamage: number;
  dmgPerLevel: number;
  unlockCost: number; // 다크젬
  upgradeBase: number; // 다크젬
}

export const TRAP_DEFS: Record<TrapType, TrapDef> = {
  Lava: {
    name: "용암 웅덩이",
    short: "용암",
    icon: "🌋",
    color: "#ff6a1f",
    hotkey: "1",
    desc: "바닥에 용암을 판다. 드래그로 넓게 깔수록 용사가 뛰어넘기 힘들다.",
    baseCost: 22,
    baseDamage: 24,
    dmgPerLevel: 8,
    unlockCost: 0,
    upgradeBase: 60,
  },
  Spike: {
    name: "낙하 가시",
    short: "가시",
    icon: "🗡️",
    color: "#cbd5e1",
    hotkey: "2",
    desc: "천장에 매달려 있다가 용사가 다가오면 떨어진다. 피해도 멈칫하게 만든다.",
    baseCost: 16,
    baseDamage: 22,
    dmgPerLevel: 7,
    unlockCost: 0,
    upgradeBase: 70,
  },
  Minion: {
    name: "화염 졸개",
    short: "졸개",
    icon: "👺",
    color: "#f43f5e",
    hotkey: "3",
    desc: "불을 뿜는 졸개. 밟히면 죽지만, 레벨 3부터 가시 투구로 밟은 용사도 아프다.",
    baseCost: 30,
    baseDamage: 9,
    dmgPerLevel: 3,
    unlockCost: 180,
    upgradeBase: 90,
  },
};

export const BOSS_FORMS: BossFormDef[] = [
  {
    name: "꼬마 마왕",
    title: "Imp Lord",
    desc: "아직 귀여운 초보 마왕. 도망치기엔 충분하다.",
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
    name: "지옥 군주",
    title: "Hellfire Baron",
    desc: "덩치가 커지고 체력·마나 재생이 늘어난다.",
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
    name: "심연의 대공",
    title: "Abyss Sovereign",
    desc: "박쥐 날개가 돋아난다. 포효가 더 멀리 밀어낸다.",
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
    name: "종말의 황제",
    title: "Doom Emperor",
    desc: "왕관과 지옥불 오라를 두른 최종 폼. 던전 전체가 떤다.",
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
    name: "초보 용사의 길",
    sub: "지하 1층",
    desc: "막 모험을 시작한 풋내기 용사. 아직은 점프도 어설프다.",
    length: 9000,
    heroName: "풋내기 용사",
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
    name: "수상한 지하 수로",
    sub: "지하 2층",
    desc: "초록 파이프 사이를 누비는 배관공 용사. 점프가 정확해진다.",
    length: 10200,
    heroName: "배관공 용사",
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
    name: "불꽃 성채",
    sub: "지하 3층",
    desc: "용암에 단련된 용사. 가시를 눈치채고 멈춰 서기도 한다.",
    length: 11400,
    heroName: "화염 단련 용사",
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
    name: "심연의 회랑",
    sub: "지하 4층",
    desc: "거의 프로 수준의 용사. 넓은 용암도 겨우 뛰어넘는다.",
    length: 12600,
    heroName: "심연 돌파 용사",
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
    name: "왕의 대성전",
    sub: "지하 5층",
    desc: "전설의 슈퍼 용사. 진짜 실력으로 트랩을 조합해야 한다.",
    length: 13800,
    heroName: "전설의 슈퍼 용사",
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
    name: "다크젬 광산",
    icon: "⛏️",
    desc: "자리를 비워도 젬이 쌓인다. (최대 8시간 분량 보관)",
    perLevel: "분당 +0.6 젬",
    baseCost: 140,
    growth: 1.9,
  },
  {
    key: "well",
    name: "마력의 샘",
    icon: "🔮",
    desc: "런 시작 시 최대 마나와 마나 재생이 증가한다.",
    perLevel: "최대 마나 +12 / 재생 +1.2",
    baseCost: 110,
    growth: 1.8,
  },
  {
    key: "vault",
    name: "마왕성 보물고",
    icon: "💰",
    desc: "런이 끝나고 얻는 모든 다크젬 보상이 늘어난다.",
    perLevel: "젬 보상 +12%",
    baseCost: 160,
    growth: 2,
  },
];

export const MAX_FACILITY_LEVEL = 5;
export const MAX_TRAP_LEVEL = 5;
