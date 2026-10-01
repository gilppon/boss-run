// Poki SDK 훅. 실제 Poki 환경(또는 ?poki 파라미터)이면 SDK를 로드하고,
// 그렇지 않으면 모의(mock) 광고 UI로 동작한다.
/* eslint-disable @typescript-eslint/no-explicit-any */

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
          real = false; // SDK를 못 쓰면 모의 모드
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

  /** 전면 광고(런 사이 휴식 지점에서 호출) */
  async commercialBreak(): Promise<void> {
    if (real) {
      try {
        await window.PokiSDK.commercialBreak();
      } catch {
        /* 광고 실패는 무시 */
      }
      return;
    }
    if (!adUI) return;
    await new Promise<void>((resolve) => adUI!("commercial", () => resolve()));
  },

  /** 보상형 광고. 시청 완료 시 true */
  async rewardedBreak(): Promise<boolean> {
    if (real) {
      try {
        return Boolean(await window.PokiSDK.rewardedBreak());
      } catch {
        return false;
      }
    }
    if (!adUI) return true;
    return new Promise<boolean>((resolve) => adUI!("rewarded", (ok) => resolve(ok)));
  },
};
