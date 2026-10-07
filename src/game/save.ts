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
    musicVolume: 1,
    sfxVolume: 1,
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
      musicVolume: clampVolume(p.musicVolume, base.musicVolume),
      sfxVolume: clampVolume(p.sfxVolume, base.sfxVolume),
      trapLevels: { ...base.trapLevels, ...(p.trapLevels ?? {}) },
      facilities: { ...base.facilities, ...(p.facilities ?? {}) },
      stats: { ...base.stats, ...(p.stats ?? {}) },
    };
  } catch {
    return base;
  }
}

function clampVolume(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export function persistSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* environments where storage is unavailable are ignored */
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
