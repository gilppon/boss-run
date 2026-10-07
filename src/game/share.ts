import { FLOORS } from './config';
import type { RunMode } from './types';

export interface BossChallenge {
  floorIndex: number;
  mode: RunMode;
  won: boolean;
  trapHits: number;
  heroDamagePct: number;
  trapsPlaced: number;
}

function param(key: string): string | null {
  const params = new URLSearchParams(window.location.search);
  const sdk = window.PokiSDK as unknown as { getURLParam?: (name: string) => string | null } | undefined;
  return sdk?.getURLParam?.(key) || params.get(key) || params.get(`gd${key}`);
}

export function readBossChallenge(): BossChallenge | null {
  if (param('type') !== 'boss_challenge') return null;
  const floorIndex = Number(param('floor'));
  const mode = param('mode');
  if (!Number.isInteger(floorIndex) || floorIndex < 0 || floorIndex >= FLOORS.length) return null;
  if (mode !== 'standard' && mode !== 'no-roar-trial') return null;
  const number = (key: string) => {
    const value = Number(param(key));
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };
  return { floorIndex, mode, won: param('won') === '1', trapHits: number('hits'), heroDamagePct: number('damage') / 100, trapsPlaced: number('traps') };
}

export async function createBossShareUrl(challenge: BossChallenge): Promise<string> {
  const params = {
    type: 'boss_challenge',
    floor: String(challenge.floorIndex),
    mode: challenge.mode,
    won: challenge.won ? '1' : '0',
    hits: String(challenge.trapHits),
    damage: String(Math.round(challenge.heroDamagePct * 100)),
    traps: String(challenge.trapsPlaced),
  };
  const sdk = window.PokiSDK as unknown as { shareableURL?: (values: Record<string, string>) => Promise<string> } | undefined;
  try {
    const url = await sdk?.shareableURL?.(params);
    if (url) return url;
  } catch {
    // The regular URL still carries the challenge when Poki is unavailable.
  }
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}
