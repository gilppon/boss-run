// Web Portal Ad Service (CrazyGames SDK v3 native + Poki fallback + Dev Intermission).
// Mutes audio during ad breaks as required by platform submission standards.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { sfx } from "./sfx";

declare global {
  interface Window {
    CrazyGames?: any;
    PokiSDK?: any;
  }
}

export type AdKind = "commercial" | "rewarded";
type AdUI = (kind: AdKind, done: (ok: boolean) => void) => void;

const CRAZY_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
const POKI_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";

let adUI: AdUI | null = null;
let provider: "crazy" | "poki" | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let loadingFinishedSent = false;
let gameplayRequested = false;
let gameplayActive = false;

export function registerAdUI(fn: AdUI | null) {
  adUI = fn;
}

function detectPortal(): "crazy" | "poki" | null {
  try {
    if (window.CrazyGames?.SDK || typeof (window as any).CrazyGames !== "undefined") return "crazy";
    const host = window.location.hostname;
    const q = window.location.search;
    if (/(^|\.)crazygames/i.test(host) || q.includes("crazy")) return "crazy";
    if (window.PokiSDK || /poki(-gdn)?\.com$/i.test(host) || q.includes("poki")) return "poki";
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

async function loadSdk(url: string): Promise<void> {
  try {
    await withTimeout(loadScript(url), 5000, undefined);
  } catch {
    /* ignore */
  }
}

function crazySdk(): any | undefined {
  return window.CrazyGames?.SDK;
}

export const PortalAd = {
  get isReal() {
    return provider !== null;
  },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        const portal = detectPortal() ?? "crazy"; // CrazyGames as default target
        if (portal === "crazy") {
          if (!crazySdk()) await loadSdk(CRAZY_URL);
          await withTimeout(crazySdk()?.init() ?? Promise.resolve(), 5000, undefined);
          if (crazySdk()) {
            provider = "crazy";
            try {
              crazySdk().game.loadingStart();
            } catch {
              /* ignore */
            }
          }
        } else if (portal === "poki") {
          await loadSdk(POKI_URL);
          await withTimeout(window.PokiSDK?.init() ?? Promise.resolve(), 5000, undefined);
          if (window.PokiSDK) provider = "poki";
        }
      } catch {
        provider = null;
      }
      ready = true;
    })();
    return withTimeout(initPromise, 8000, undefined);
  },

  loadingFinished() {
    if (!ready || loadingFinishedSent) return;
    if (provider === "crazy") {
      try {
        crazySdk()?.game?.loadingStop();
      } catch {
        /* ignore */
      }
    } else if (provider === "poki") {
      window.PokiSDK?.gameLoadingFinished?.();
    }
    loadingFinishedSent = true;
    if (gameplayRequested) this.gameplayStart();
  },

  gameplayStart() {
    gameplayRequested = true;
    if (!ready || !loadingFinishedSent || gameplayActive || !provider) return;
    try {
      if (provider === "crazy") crazySdk()?.game?.gameplayStart();
      else if (provider === "poki") window.PokiSDK?.gameplayStart?.();
      gameplayActive = true;
    } catch {
      /* ignore */
    }
  },

  gameplayStop() {
    gameplayRequested = false;
    if (!ready || !loadingFinishedSent || !gameplayActive || !provider) return;
    try {
      if (provider === "crazy") crazySdk()?.game?.gameplayStop();
      else if (provider === "poki") window.PokiSDK?.gameplayStop?.();
    } catch {
      /* ignore */
    } finally {
      gameplayActive = false;
    }
  },

  /** Commercial ad (midgame break) */
  async commercialBreak(): Promise<void> {
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
          const requestAd = crazySdk()?.ad?.requestAd;
          if (typeof requestAd !== "function") {
            finish(new Error("CrazyGames ad API unavailable"));
            return;
          }
          requestAd.call(crazySdk()?.ad, "midgame", {
            adStarted: () => sfx.setAdMuted(true),
            adFinished: () => finish(),
            adError: (error: unknown) => finish(error ?? new Error("CrazyGames ad error")),
          });
        });
      } catch {
        /* ad failures are gracefully ignored */
      } finally {
        sfx.setAdMuted(false);
      }
      return;
    }

    if (provider === "poki" && ready) {
      try {
        await window.PokiSDK.commercialBreak(() => sfx.setAdMuted(true));
      } catch {
        /* ignore */
      } finally {
        sfx.setAdMuted(false);
      }
      return;
    }

    // Offline / Local development fallback
    if (!adUI) return;
    sfx.setAdMuted(true);
    try {
      await new Promise<void>((resolve) => adUI!("commercial", () => resolve()));
    } finally {
      sfx.setAdMuted(false);
    }
  },

  /** Rewarded ad. Returns true when watched to completion */
  async rewardedBreak(): Promise<boolean> {
    if (provider === "crazy" && ready) {
      try {
        return await new Promise<boolean>((resolve) => {
          let settled = false;
          const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            resolve(ok);
          };
          const requestAd = crazySdk()?.ad?.requestAd;
          if (typeof requestAd !== "function") {
            finish(false);
            return;
          }
          requestAd.call(crazySdk()?.ad, "rewarded", {
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

    if (provider === "poki" && ready) {
      try {
        return Boolean(await window.PokiSDK.rewardedBreak({ onStart: () => sfx.setAdMuted(true) }));
      } catch {
        return false;
      } finally {
        sfx.setAdMuted(false);
      }
    }

    // Local development fallback
    if (!adUI) return true;
    sfx.setAdMuted(true);
    try {
      return await new Promise<boolean>((resolve) => adUI!("rewarded", (ok) => resolve(ok)));
    } finally {
      sfx.setAdMuted(false);
    }
  },
};

// Aliased export for backward compatibility
export const Poki = PortalAd;
