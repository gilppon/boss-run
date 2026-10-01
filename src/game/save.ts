import type { SaveData } from "./types";

const KEY = "reverse-boss-runner-save-v1";

export function defaultSave(): SaveData {
  return {
    gems: 0,
    totalEarned: 0,
    trapLevels: { Lava: 1, Spike: 1, Minion: 0 },
    bossForm: 0,
    cleared: 0,
    selectedFloor: 0,
    facilities: { mine: 0, well: 0, vault: 0 },
    lastCollect: Date.now(),
    stats: { runs: 0, wins: 0, heroesDefeated: 0 },
    soundOn: true,
    seenTutorial: false,
    lowFx: false,
    lastDaily: 0,
    dailyStreak: 0,
  };
}

export function loadSave(): SaveData {
  const base = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<SaveData>;
    return {
      ...base,
      ...p,
      trapLevels: { ...base.trapLevels, ...(p.trapLevels ?? {}) },
      facilities: { ...base.facilities, ...(p.facilities ?? {}) },
      stats: { ...base.stats, ...(p.stats ?? {}) },
    };
  } catch {
    return base;
  }
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 저장소를 못 쓰는 환경은 무시 */
  }
}

export function resetSave(): SaveData {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
  return defaultSave();
}
