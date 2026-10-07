// Portal ad hook (Poki / CrazyGames / mock auto-detect).
// On a real portal environment (or with the ?poki / ?crazy param) that portal's
// SDK is loaded; otherwise it falls back to the mock ad UI.
// Audio is force-muted for the duration of every ad: both portals require it.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { sfx } from "./sfx";

declare global {
  interface Window {
    PokiSDK?: any;
    CrazyGames?: any;
  }
}

export type AdKind = "commercial" | "rewarded";
type AdUI = (kind: AdKind, done: (ok: boolean) => void) => void;

const POKI_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const CRAZY_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";

let adUI: AdUI | null = null;
let provider: "poki" | "crazy" | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let loadingFinishedSent = false;
let gameplayRequested = false;
let gameplayActive = false;

export function registerAdUI(fn: AdUI | null) {
  adUI = fn;
}

function env(): "poki" | "crazy" | null {
  try {
    const host = window.location.hostname;
    const q = window.location.search;
    if (/poki(-gdn)?\.com$/.test(host) || q.includes("poki")) return "poki";
    if (/(^|\.)crazygames\.com$/.test(host) || q.includes("crazy")) return "crazy";
  } catch {
    /* ignore */
  }
  return null;
}

function loadScript(src: string, timeout = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("sdk timeout")), timeout);
    s.src = src;
    s.async = true;
    s.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("sdk load error"));
    };
    document.head.appendChild(s);
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms))]);
}

/** Inject a portal SDK; never throws and never hangs (blocked / offline falls through). */
async function loadSdk(url: string): Promise<void> {
  try {
    await withTimeout(loadScript(url), 5000, undefined);
  } catch {
    /* ignore */
  }
}

function crazy(): any | undefined {
  return window.CrazyGames?.SDK;
}

export const Poki = {
  get isReal() {
    return provider !== null;
  },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const e = env();
        if (e === "poki") {
          await loadSdk(POKI_URL);
          await withTimeout(window.PokiSDK?.init() ?? Promise.resolve(), 5000, undefined);
          if (window.PokiSDK) provider = "poki";
        } else if (e === "crazy") {
          await loadSdk(CRAZY_URL);
          await withTimeout(crazy()?.init() ?? Promise.resolve(), 5000, undefined);
          if (crazy()) {
            provider = "crazy";
            try {
              crazy().game.loadingStart();
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        provider = null; // fall back to mock mode if the SDK won't load
      }
      ready = true;
    })();
    return withTimeout(initPromise, 8000, undefined);
  },

  loadingFinished() {
    if (!ready || loadingFinishedSent) return;
    if (provider === "poki") {
      window.PokiSDK?.gameLoadingFinished?.();
    } else if (provider === "crazy") {
      try {
        crazy()?.game?.loadingStop();
      } catch {
        /* ignore */
      }
    }
    loadingFinishedSent = true;
    if (gameplayRequested) this.gameplayStart();
  },

  gameplayStart() {
    gameplayRequested = true;
    if (!ready || !loadingFinishedSent || gameplayActive || !provider) return;
    try {
      if (provider === "poki") window.PokiSDK?.gameplayStart?.();
      else if (provider === "crazy") crazy()?.game?.gameplayStart();
      gameplayActive = true;
    } catch {
      /* ignore */
    }
  },

  gameplayStop() {
    gameplayRequested = false;
    if (!ready || !loadingFinishedSent || !gameplayActive || !provider) return;
    try {
      if (provider === "poki") window.PokiSDK?.gameplayStop?.();
      else if (provider === "crazy") crazy()?.game?.gameplayStop();
    } catch {
      /* ignore */
    } finally {
      gameplayActive = false;
    }
  },

  /** Commercial ad (called at the breather point between runs) */
  async commercialBreak(): Promise<void> {
    if (provider === "poki" && ready) {
      try {
        await window.PokiSDK.commercialBreak(() => sfx.setAdMuted(true));
      } catch {
        /* ad failures are ignored */
      } finally {
        sfx.setAdMuted(false);
      }
      return;
    }
    if (provider === "crazy" && ready) {
      try {
        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (error?: unknown) => {
            if (settled) return;
            settled = true;
            if (error !== undefined) reject(error);
            else resolve();
          };
          const requestAd = crazy()?.ad?.requestAd;
          if (typeof requestAd !== "function") {
            finish(new Error("CrazyGames ad API unavailable"));
            return;
          }
          requestAd.call(crazy()?.ad, "midgame", {
            adStarted: () => sfx.setAdMuted(true),
            adFinished: () => finish(),
            adError: (error: unknown) => finish(error ?? new Error("CrazyGames ad error")),
          });
        });
      } catch {
        /* ad failures are ignored */
      } finally {
        sfx.setAdMuted(false);
      }
      return;
    }
    // Portal runs must never fall through to the local simulated ad UI.
    if (env() !== null || !adUI) return;
    sfx.setAdMuted(true);
    try {
      await new Promise<void>((resolve) => adUI!("commercial", () => resolve()));
    } finally {
      sfx.setAdMuted(false);
    }
  },

  /** Rewarded ad. Returns true when watched to completion */
  async rewardedBreak(): Promise<boolean> {
    if (provider === "poki" && ready) {
      try {
        return Boolean(await window.PokiSDK.rewardedBreak({ onStart: () => sfx.setAdMuted(true) }));
      } catch {
        return false;
      } finally {
        sfx.setAdMuted(false);
      }
    }
    if (provider === "crazy" && ready) {
      try {
        return await new Promise<boolean>((resolve, reject) => {
          let settled = false;
          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            resolve(ok);
          };
          const requestAd = crazy()?.ad?.requestAd;
          if (typeof requestAd !== "function") {
            reject(new Error("CrazyGames ad API unavailable"));
            return;
          }
          requestAd.call(crazy()?.ad, "rewarded", {
            adStarted: () => sfx.setAdMuted(true),
            adFinished: () => finish(true),
            adError: () => finish(false),
          });
        });
      } catch {
        return false;
      } finally {
        sfx.setAdMuted(false);
      }
    }
    // Never replace a failed or unavailable portal ad with a simulated reward.
    // Keep the mock ad only for ordinary off-portal development.
    if (env() !== null || !adUI) return false;
    sfx.setAdMuted(true);
    try {
      return await new Promise<boolean>((resolve) => adUI!("rewarded", (ok) => resolve(ok)));
    } finally {
      sfx.setAdMuted(false);
    }
  },
};
