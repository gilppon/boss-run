// Load only the SDK for the hosting portal. Local ad simulation is development-only.

import { sfx } from "./sfx";

interface PortalSettings {
  muteAudio?: boolean;
}

interface CrazyGamesSdk {
  init?: () => void | Promise<void>;
  game?: {
    loadingStart?: () => void;
    loadingStop?: () => void;
    gameplayStart?: () => void;
    gameplayStop?: () => void;
    settings?: PortalSettings;
    addSettingsChangeListener?: (listener: (settings: PortalSettings) => void) => void;
  };
  ad?: {
    requestAd?: (type: "rewarded", callbacks: {
      adStarted?: () => void;
      adFinished?: () => void;
      adError?: () => void;
    }) => void;
  };
}

interface PokiSdk {
  init?: () => void | Promise<void>;
  gameLoadingFinished?: () => void;
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  measure?: (category: string, what: string, action: string) => void;
  commercialBreak?: (onAdStarted?: () => void) => unknown;
  rewardedBreak?: (onAdStarted?: () => void) => unknown;
}

declare global {
  interface Window {
    CrazyGames?: { SDK?: CrazyGamesSdk };
    PokiSDK?: PokiSdk;
  }
}

export type AdKind = "rewarded";
type AdUI = (done: (ok: boolean) => void) => void;
type StopReason = "pause" | "focus" | "end" | "navigation";

const CRAZY_URL = "https://sdk.crazygames.com/crazygames-sdk-v3.js";
const POKI_URL = "https://game-cdn.poki.com/scripts/v2/poki-sdk.js";
const AD_TIMEOUT_MS = 60_000;

let adUI: AdUI | null = null;
let provider: "crazy" | "poki" | null = null;
let portalTarget: "crazy" | "poki" | null = null;
let ready = false;
let initPromise: Promise<void> | null = null;
let loadingFinishedRequested = false;
let loadingFinishedSent = false;
let gameplayRequested = false;
let gameplayActive = false;
let pokiFirstGameplayInputSeen = false;
let rewardedRequestActive = false;

export function registerAdUI(fn: AdUI | null) {
  adUI = fn;
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function portalForHost(host: string): "crazy" | "poki" | null {
  if (matchesDomain(host, "crazygames.com")) return "crazy";
  if (matchesDomain(host, "poki.com") || matchesDomain(host, "poki-gdn.com")) return "poki";
  return null;
}

function detectPortal(): "crazy" | "poki" | null {
  try {
    const currentHost = window.location.hostname.toLowerCase();
    const referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : "";
    const hostPortal = portalForHost(currentHost) ?? portalForHost(referrerHost);
    if (hostPortal) return hostPortal;

    // Query overrides are only for local development and cannot change a production host.
    if (import.meta.env.DEV) {
      const params = new URLSearchParams(window.location.search);
      const override = (params.get("portal") ?? (params.has("crazy") ? "crazy" : params.has("poki") ? "poki" : "")).toLowerCase();
      if (override === "crazy" || override === "poki") return override;
    }

    const hasCrazy = Boolean(window.CrazyGames?.SDK);
    const hasPoki = typeof window.PokiSDK !== "undefined";
    if (hasCrazy !== hasPoki) return hasCrazy ? "crazy" : "poki";
  } catch {
    // A game without a recognized portal still runs without ads.
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      () => {
        window.clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

function loadScript(src: string, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) reject(error);
      else resolve();
    };
    const timer = window.setTimeout(() => {
      script.remove();
      finish(new Error("portal SDK load timeout"));
    }, timeout);
    script.src = src;
    script.async = true;
    script.onload = () => finish();
    script.onerror = () => finish(new Error("portal SDK load failed"));
    document.head.appendChild(script);
  });
}

async function loadSdk(url: string): Promise<boolean> {
  return withTimeout(loadScript(url).then(() => true), 6000, false);
}

function crazySdk(): CrazyGamesSdk | undefined {
  return window.CrazyGames?.SDK;
}

function crazyAdsEnabled(): boolean {
  return import.meta.env.VITE_CRAZYGAMES_LAUNCH === "full";
}

function requestCrazyRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (watched: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      sfx.setAdMuted(false);
      resolve(watched);
    };
    const timer = window.setTimeout(() => finish(false), AD_TIMEOUT_MS);
    const ad = crazySdk()?.ad;
    if (typeof ad?.requestAd !== "function") {
      finish(false);
      return;
    }
    try {
      ad.requestAd("rewarded", {
        adStarted: () => {
          if (!settled) sfx.setAdMuted(true);
        },
        adFinished: () => finish(true),
        adError: () => finish(false),
      });
    } catch {
      finish(false);
    }
  });
}

async function requestDevRewardedAd(): Promise<boolean> {
  const ui = import.meta.env.DEV && portalTarget === null ? adUI : null;
  if (!ui) return false;
  sfx.setAdMuted(true);
  try {
    return await new Promise<boolean>((resolve) => ui(resolve));
  } finally {
    sfx.setAdMuted(false);
  }
}

export const PortalAd = {
  get isReal() {
    return provider !== null;
  },

  get shouldStartDirectlyInGameplay() {
    return provider === "crazy" && crazyAdsEnabled();
  },

  get canOfferRewardedAds() {
    if (!ready || rewardedRequestActive) return false;
    if (provider === "poki") return typeof window.PokiSDK?.rewardedBreak === "function";
    if (provider === "crazy") return crazyAdsEnabled() && typeof crazySdk()?.ad?.requestAd === "function";
    return import.meta.env.DEV && portalTarget === null && adUI !== null;
  },

  /** Send stable, game-specific events through Poki's built-in analytics only. */
  measure(category: string, what: string, action: string) {
    if (provider !== "poki" || typeof window.PokiSDK?.measure !== "function") return;
    try {
      window.PokiSDK.measure(category, what, action);
    } catch {
      // Portal analytics must never interrupt gameplay.
    }
  },

  init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const target = detectPortal();
      portalTarget = target;
      try {
        if (target === "crazy") {
          if (!crazySdk()) await loadSdk(CRAZY_URL);
          const sdk = crazySdk();
          const initialize = sdk?.init;
          if (sdk && typeof initialize === "function") {
            const initialized = await withTimeout(Promise.resolve().then(() => initialize.call(sdk)).then(() => true), 5000, false);
            if (initialized) {
              provider = "crazy";
              sdk.game?.loadingStart?.();
              const applySettings = (settings: { muteAudio?: boolean }) => sfx.setSdkMuted(settings.muteAudio === true);
              try {
                applySettings(sdk.game?.settings ?? {});
                sdk.game?.addSettingsChangeListener?.(applySettings);
              } catch {
                // Settings integration must not make the game unavailable.
              }
            }
          }
        } else if (target === "poki") {
          if (!window.PokiSDK) await loadSdk(POKI_URL);
          const sdk = window.PokiSDK;
          const initialize = sdk?.init;
          if (sdk && typeof initialize === "function") {
            const initialized = await withTimeout(Promise.resolve().then(() => initialize.call(sdk)).then(() => true), 5000, false);
            if (initialized) provider = "poki";
          }
        }
      } catch {
        provider = null;
      } finally {
        ready = true;
        if (loadingFinishedRequested) this.loadingFinished();
      }
    })();
    return initPromise;
  },

  loadingFinished() {
    loadingFinishedRequested = true;
    if (!ready || loadingFinishedSent) return;
    if (provider === "crazy") {
      try {
        crazySdk()?.game?.loadingStop?.();
      } catch {
        // Keep the game playable if a portal lifecycle callback fails.
      }
    } else if (provider === "poki") {
      try {
        window.PokiSDK?.gameLoadingFinished?.();
      } catch {
        // Keep the game playable if a portal lifecycle callback fails.
      }
    }
    loadingFinishedSent = true;
    if (gameplayRequested) this.gameplayStart();
  },

  gameplayStart() {
    gameplayRequested = true;
    if (!ready || !loadingFinishedSent || gameplayActive || !provider) return;
    // Poki counts the first gameplay start from the player's first input, not scene load.
    if (provider === "poki" && !pokiFirstGameplayInputSeen) return;
    try {
      if (provider === "crazy") crazySdk()?.game?.gameplayStart?.();
      else if (provider === "poki") window.PokiSDK?.gameplayStart?.();
      gameplayActive = true;
    } catch {
      // Keep gameplay independent from portal analytics callbacks.
    }
  },

  notePlayerInput() {
    pokiFirstGameplayInputSeen = true;
    if (gameplayRequested && !gameplayActive) this.gameplayStart();
  },

  gameplayStop(reason: StopReason = "pause") {
    gameplayRequested = false;
    // CrazyGames counts focus changes as still playing; only send stops for real breaks.
    if (provider === "crazy" && reason === "focus") return;
    if (!ready || !loadingFinishedSent || !gameplayActive || !provider) return;
    try {
      if (provider === "crazy") crazySdk()?.game?.gameplayStop?.();
      else if (provider === "poki") window.PokiSDK?.gameplayStop?.();
    } catch {
      // Keep gameplay independent from portal analytics callbacks.
    } finally {
      gameplayActive = false;
    }
  },

  /** Request a commercial break only at an explicit pause-resume boundary. */
  async commercialBreak(): Promise<void> {
    if (!ready) return;
    // CrazyGames midgame ads belong at game-flow breaks, not pause/settings screens.
    if (provider !== "poki") return;
    const sdk = window.PokiSDK;
    const commercialBreak = sdk?.commercialBreak;
    if (!sdk || typeof commercialBreak !== "function") return;
    let requestActive = true;
    sfx.setAdMuted(false);
    await withTimeout(
      Promise.resolve().then(() => commercialBreak.call(sdk, () => {
        if (requestActive) sfx.setAdMuted(true);
      })).then(() => true),
      AD_TIMEOUT_MS,
      false,
    );
    requestActive = false;
    sfx.setAdMuted(false);
  },

  /** Reward only when the selected portal confirms a completed rewarded ad. */
  async rewardedBreak(): Promise<boolean> {
    if (!this.canOfferRewardedAds) return false;
    rewardedRequestActive = true;
    try {
      if (provider === "crazy") return await requestCrazyRewardedAd();
      if (provider === "poki") {
        const sdk = window.PokiSDK;
        const rewardedBreak = sdk?.rewardedBreak;
        if (!sdk || typeof rewardedBreak !== "function") return false;
        let requestActive = true;
        sfx.setAdMuted(false);
        try {
          return await withTimeout(
            Promise.resolve().then(() => rewardedBreak.call(sdk, () => {
              if (requestActive) sfx.setAdMuted(true);
            })).then(Boolean),
            AD_TIMEOUT_MS,
            false,
          );
        } finally {
          requestActive = false;
          sfx.setAdMuted(false);
        }
      }
      return await requestDevRewardedAd();
    } finally {
      rewardedRequestActive = false;
    }
  },
};

// Aliased export for backward compatibility.
export const Poki = PortalAd;
