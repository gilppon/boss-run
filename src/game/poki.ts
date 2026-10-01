// Poki SDK hook. On a real Poki environment (or with the ?poki param) the SDK
// is loaded; otherwise it falls back to the mock ad UI.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { sfx } from "./sfx";

declare global {
  interface Window {
    PokiSDK?: any;
  }
}

export type AdKind = "commercial" | "rewarded";
type AdUI = (kind: AdKind, done: (ok: boolean) => void) => void;

const SDK_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";

let adUI: AdUI | null = null;
let real = false;
let ready = false;
let initPromise: Promise<void> | null = null;

export function registerAdUI(fn: AdUI | null) {
  adUI = fn;
}

function shouldUseRealSdk(): boolean {
  try {
    const host = window.location.hostname;
    return /poki(-gdn)?\.com$/.test(host) || window.location.search.includes("poki");
  } catch {
    return false;
  }
}

function loadScript(src: string, timeout = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    const timer = window.setTimeout(() => reject(new Error("poki timeout")), timeout);
    s.src = src;
    s.async = true;
    s.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("poki load error"));
    };
    document.head.appendChild(s);
  });
}

export const Poki = {
  get isReal() {
    return real;
  },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (shouldUseRealSdk()) {
        try {
          await loadScript(SDK_URL);
          await window.PokiSDK?.init();
          real = true;
        } catch {
          real = false; // fall back to mock mode if the SDK won't load
        }
      }
      ready = true;
    })();
    return initPromise;
  },

  loadingFinished() {
    if (real) window.PokiSDK?.gameLoadingFinished?.();
  },

  gameplayStart() {
    if (real && ready) window.PokiSDK?.gameplayStart?.();
  },

  gameplayStop() {
    if (real && ready) window.PokiSDK?.gameplayStop?.();
  },

  /** Commercial ad (called at the breather point between runs) */
  async commercialBreak(): Promise<void> {
    if (real) {
      try {
        await window.PokiSDK.commercialBreak(() => sfx.setAdMuted(true));
      } catch {
        /* ad failures are ignored */
      } finally {
        sfx.setAdMuted(false);
      }
      return;
    }
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
    if (real) {
      try {
        return Boolean(
          await window.PokiSDK.rewardedBreak({ onStart: () => sfx.setAdMuted(true) }),
        );
      } catch {
        return false;
      } finally {
        sfx.setAdMuted(false);
      }
    }
    if (!adUI) return true;
    sfx.setAdMuted(true);
    try {
      return await new Promise<boolean>((resolve) => adUI!("rewarded", (ok) => resolve(ok)));
    } finally {
      sfx.setAdMuted(false);
    }
  },
};
