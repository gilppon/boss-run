import { useCallback, useEffect, useRef, useState } from "react";
import AdOverlay, { type AdState } from "./components/AdOverlay";
import HelpModal from "./components/HelpModal";
import MainMenu from "./components/MainMenu";
import PlayScreen from "./components/PlayScreen";
import ResultModal, { type ResultInfo } from "./components/ResultModal";
import Shop, { type ShopTab } from "./components/Shop";
import { FLOORS } from "./game/config";
import { loadBackdrop } from "./game/assets";
import { bus } from "./game/bus";
import { readBossChallenge } from "./game/share";
import { PortalAd, registerAdUI } from "./game/portalAd";
import {
  addGems,
  applyRunEnd,
  buildRunConfig,
  buyFacility,
  buyForm,
  buyTrap,
  claimDaily,
  collectMine,
  computeReward,
} from "./game/progression";
import { loadSave, persistSave, resetSave } from "./game/save";
import { setFxQuality } from "./game/fx";
import { sfx, setAudioVolumes, setMusicTheme, startMusic, stopMusic } from "./game/sfx";
import type { RunConfig, RunMode, RunResult, SaveData, TrapType } from "./game/types";

export default function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<"menu" | "play">("menu");
  const [runCfg, setRunCfg] = useState<RunConfig | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<ResultInfo | null>(null);
  const [shop, setShop] = useState<ShopTab | null>(null);
  const [help, setHelp] = useState(false);
  const [ad, setAd] = useState<AdState | null>(null);
  const [adOffersAvailable, setAdOffersAvailable] = useState(false);
  const [challenge] = useState(readBossChallenge);

  const saveRef = useRef(save);
  saveRef.current = save;
  const cfgRef = useRef<RunConfig | null>(null);
  cfgRef.current = runCfg;
  const resultRef = useRef<ResultInfo | null>(null);
  resultRef.current = result;
  const adRef = useRef<AdState | null>(null);
  const reviveUsedThisSession = useRef(false);
  const measuredRunKeyRef = useRef<number | null>(null);

  const refreshAdAvailability = useCallback(() => {
    setAdOffersAvailable(PortalAd.canOfferRewardedAds);
  }, []);

  // Persist save & sync sound/fx settings
  useEffect(() => {
    persistSave(save);
    sfx.setEnabled(save.soundOn);
    setAudioVolumes(save.musicVolume, save.sfxVolume);
    setFxQuality(save.lowFx);
  }, [save]);

  const closeAd = useCallback((ok: boolean) => {
    const a = adRef.current;
    adRef.current = null;
    setAd(null);
    a?.done(ok);
  }, []);

  const startRun = useCallback((
    floorIdx: number,
    opts?: { heroHpScale?: number; mode?: RunMode; practiceOnly?: boolean },
    portalAutoStart = false,
  ) => {
    const initialSave = saveRef.current;
    const practiceOnly = opts?.practiceOnly ?? false;
    const targetFloor = Math.min(Math.max(0, floorIdx), FLOORS.length - 1);
    setMusicTheme(practiceOnly ? targetFloor : Math.min(targetFloor, initialSave.cleared));
    if (!portalAutoStart) {
      sfx.unlock();
      // Music needs the same first gesture as the AudioContext itself.
      startMusic();
    }
    setShop(null);
    setHelp(false);
    const s = saveRef.current;
    const idx = practiceOnly ? targetFloor : Math.min(targetFloor, s.cleared);
    setMusicTheme(idx);
    const shouldShowTutorial = !s.seenTutorial && !s.tutorialSkipped;
    setShowHint(shouldShowTutorial);
    if (!practiceOnly) setSave((p) => ({ ...p, selectedFloor: idx }));
    setResult(null);
    const mode = opts?.mode ?? "standard";
    if (!portalAutoStart) PortalAd.notePlayerInput();
    const cfg = buildRunConfig(s, idx, mode);
    if (opts?.heroHpScale) cfg.heroHpScale = opts.heroHpScale;
    cfg.tutorialHold = shouldShowTutorial;
    cfg.practiceOnly = practiceOnly;
    setRunCfg(cfg);
    setRunKey((k) => k + 1);
    setScreen("play");
  }, []);

  // Initialize the selected portal alongside the first playable assets.
  useEffect(() => {
    if (import.meta.env.DEV) {
      registerAdUI((done) => {
        const nextAd: AdState = { done };
        adRef.current = nextAd;
        setAd(nextAd);
      });
    }
    let active = true;
    let unlockAudioOnGesture: (() => void) | null = null;
    void Promise.all([PortalAd.init(), loadBackdrop(0)]).then(() => {
      if (!active) return;
      refreshAdAvailability();
      const currentSave = saveRef.current;
      const firstRunOnPortal = PortalAd.isReal && !currentSave.seenTutorial && !currentSave.tutorialSkipped;
      if (PortalAd.shouldStartDirectlyInGameplay || firstRunOnPortal) {
        const floorIndex = challenge?.floorIndex ?? Math.min(currentSave.selectedFloor, currentSave.cleared, FLOORS.length - 1);
        startRun(floorIndex, {
          mode: challenge?.mode ?? "standard",
          practiceOnly: challenge !== null && challenge.floorIndex > currentSave.cleared,
        }, true);
        const onFirstGesture = () => {
          PortalAd.notePlayerInput();
          sfx.unlock();
          startMusic();
          window.removeEventListener("pointerdown", onFirstGesture, true);
          window.removeEventListener("keydown", onFirstGesture, true);
          unlockAudioOnGesture = null;
        };
        unlockAudioOnGesture = onFirstGesture;
        window.addEventListener("pointerdown", onFirstGesture, true);
        window.addEventListener("keydown", onFirstGesture, true);
      }
    });
    return () => {
      active = false;
      if (unlockAudioOnGesture) {
        window.removeEventListener("pointerdown", unlockAudioOnGesture, true);
        window.removeEventListener("keydown", unlockAudioOnGesture, true);
      }
      if (import.meta.env.DEV) registerAdUI(null);
    };
  }, [challenge, refreshAdAvailability, startRun]);

  const handleGameplayReady = useCallback(() => {
    PortalAd.loadingFinished();
    PortalAd.gameplayStart();
    const cfg = cfgRef.current;
    if (!cfg || cfg.practiceOnly || measuredRunKeyRef.current === runKey) return;
    measuredRunKeyRef.current = runKey;
    const floor = String(cfg.floorIndex + 1);
    PortalAd.measure("level", floor, "start");
    if (cfg.tutorialHold) {
      PortalAd.measure("tutorial", "first-trap", "start");
      PortalAd.measure("hint", "first-trap", "visible");
    }
  }, [runKey]);

  const handleTutorialStepComplete = useCallback(() => {
    const currentSave = saveRef.current;
    if (!cfgRef.current?.tutorialHold || currentSave.seenTutorial || currentSave.tutorialSkipped) return;
    PortalAd.measure("hint", "first-trap", "interact");
    PortalAd.measure("tutorial", "first-trap", "complete");
    setSave((current) => current.seenTutorial || current.tutorialSkipped ? current : { ...current, seenTutorial: true });
  }, []);

  const handleTutorialSkip = useCallback(() => {
    const currentSave = saveRef.current;
    if (!cfgRef.current?.tutorialHold || currentSave.seenTutorial || currentSave.tutorialSkipped) return;
    PortalAd.measure("tutorial", "first-trap", "skip");
    setShowHint(false);
    setSave((current) => current.seenTutorial || current.tutorialSkipped ? current : { ...current, tutorialSkipped: true });
    bus.emit("tutorial-skip");
  }, []);

  const handleEnd = useCallback((r: RunResult) => {
    PortalAd.gameplayStop("end");
    stopMusic();
    const cfg = cfgRef.current;
    if (!cfg) return;
    const s = saveRef.current;
    const idx = cfg.floorIndex;
    if (!cfg.practiceOnly && measuredRunKeyRef.current === runKey) {
      PortalAd.measure("level", String(idx + 1), r.won ? "complete" : "fail");
      measuredRunKeyRef.current = null;
    }
    const reward = cfg.practiceOnly
      ? { base: 0, bonus: 0, vaultPct: 0, challengeBonus: 0, total: 0 }
      : computeReward(s, idx, r, cfg.mode);
    const unlockedNext = !cfg.practiceOnly && r.won && s.cleared === idx && idx + 1 < FLOORS.length;
    if (!cfg.practiceOnly) setSave(applyRunEnd(s, idx, r, reward.total));
    setResult({ r, reward, floorIndex: idx, mode: cfg.mode, adClaimed: false, unlockedNext, adBusy: false, practiceOnly: cfg.practiceOnly });
  }, [runKey]);

  const watchAd = useCallback(async () => {
    const cur = resultRef.current;
    if (!cur || cur.practiceOnly || !cur.r.won || cur.adClaimed || cur.adBusy) return;
    setResult({ ...cur, adBusy: true, adUnavailable: false });
    const ok = await PortalAd.rewardedBreak();
    refreshAdAvailability();
    if (ok) {
      setSave((p) => addGems(p, cur.reward.total));
      sfx.coin();
      setResult((r) => (r ? { ...r, adClaimed: true, adBusy: false, adUnavailable: false } : r));
    } else {
      setResult((r) => (r ? { ...r, adBusy: false, adUnavailable: true } : r));
    }
  }, [refreshAdAvailability]);

  // Offer at most one revive per session and leave the normal retry path available.
  const revive = useCallback(async () => {
    const cur = resultRef.current;
    if (!cur || cur.practiceOnly || cur.r.won || cur.adBusy || reviveUsedThisSession.current) return;
    setResult({ ...cur, adBusy: true, adUnavailable: false });
    const ok = await PortalAd.rewardedBreak();
    refreshAdAvailability();
    if (ok) {
      reviveUsedThisSession.current = true;
      sfx.go();
      startRun(cur.floorIndex, { heroHpScale: 0.5, mode: cur.mode });
    } else {
      setResult((r) => (r ? { ...r, adBusy: false, adUnavailable: true } : r));
    }
  }, [refreshAdAvailability, startRun]);

  const toMenu = useCallback(() => {
    PortalAd.gameplayStop("navigation");
    stopMusic();
    setResult(null);
    setRunCfg(null);
    setScreen("menu");
  }, []);

  const closeHelp = useCallback(() => {
    setHelp(false);
  }, []);

  const openShopFromResult = useCallback((tab: ShopTab = "trap") => {
    setResult(null);
    setRunCfg(null);
    setScreen("menu");
    setShop(tab);
  }, []);

  const toggleSound = useCallback(
    () =>
      setSave((p) => {
        const next = !p.soundOn;
        sfx.setEnabled(next);
        // Unmuting is a gesture: (re)start the loop if it never got going.
        if (next) startMusic();
        return { ...p, soundOn: next };
      }),
    [],
  );
  const toggleFx = useCallback(() => setSave((p) => ({ ...p, lowFx: !p.lowFx })), []);
  const setAudioVolume = useCallback((channel: "musicVolume" | "sfxVolume", value: number) => {
    setSave((p) => ({ ...p, [channel]: Math.max(0, Math.min(1, value)) }));
  }, []);

  const purchase = (fn: () => SaveData | null) => {
    const next = fn();
    if (next) {
      setSave(next);
      sfx.coin();
    } else sfx.denied();
  };

  return (
    <div className="h-full w-full bg-[#0b0309] text-white">
      {screen === "menu" && (
        <MainMenu
          save={save}
          onStart={(floor, mode) => startRun(floor, { mode })}
          onSelectFloor={(i) => setSave((p) => ({ ...p, selectedFloor: i }))}
          onShop={(tab) => setShop(tab ?? "trap")}
          onHelp={() => setHelp(true)}
          onCollect={() => {
            const { save: ns, amount } = collectMine(saveRef.current, Date.now());
            if (amount > 0) {
              setSave(ns);
              sfx.coin();
            }
          }}
          onClaimDaily={() => {
            const { save: ns, amount } = claimDaily(saveRef.current, Date.now());
            if (amount > 0) {
              setSave(ns);
              sfx.coin();
            }
          }}
          onToggleSound={toggleSound}
          onSetAudioVolume={setAudioVolume}
          onToggleFx={toggleFx}
          onReset={() => {
            setSave(resetSave());
          }}
        />
      )}
      {screen === "menu" && challenge && (
        <div className="fixed left-1/2 top-3 z-50 w-[min(92vw,440px)] -translate-x-1/2 rounded-2xl border-2 border-orange-300/70 bg-[#180a17]/95 p-3 text-center shadow-xl">
          <div className="text-xs font-black tracking-widest text-orange-200">FRIEND’S TRAP CHALLENGE</div>
          <div className="mt-1 text-sm font-bold text-white">
            Floor {challenge.floorIndex + 1} · {challenge.trapHits} trap hits · {Math.round(challenge.heroDamagePct * 100)}% hero damage
          </div>
          <div className="mt-2 text-[10px] font-bold text-orange-100/60">
            {challenge.floorIndex > save.cleared ? 'Locked floor · unranked practice' : 'Same floor · campaign progress counts'}
          </div>
          <button
            onClick={() => void startRun(challenge.floorIndex, { mode: challenge.mode, practiceOnly: challenge.floorIndex > save.cleared })}
            className="mt-2 rounded-full bg-orange-400 px-4 py-1.5 text-xs font-black text-black"
          >
            {challenge.floorIndex > save.cleared ? 'Practice this floor' : 'Try this floor'}
          </button>
        </div>
      )}

      {screen === "play" && runCfg && (
        <PlayScreen
          key={runKey}
          config={runCfg}
          showHint={showHint}
          soundOn={save.soundOn}
          musicVolume={save.musicVolume}
          sfxVolume={save.sfxVolume}
          onToggleSound={toggleSound}
          onSetAudioVolume={setAudioVolume}
          onEnd={handleEnd}
          onGameplayReady={handleGameplayReady}
          onTutorialStepComplete={handleTutorialStepComplete}
          onTutorialSkip={handleTutorialSkip}
          onQuit={toMenu}
        />
      )}

      {screen === "play" && result && (
        <ResultModal
          info={result}
          canOfferRewardedAds={adOffersAvailable}
          canOfferRevive={adOffersAvailable && !reviveUsedThisSession.current}
          onRetry={() => startRun(result.floorIndex, { mode: result.mode, practiceOnly: result.practiceOnly })}
          onNext={() => startRun(result.floorIndex + 1, { mode: result.mode })}
          onMenu={toMenu}
          onShop={() => openShopFromResult("trap")}
          onWatchAd={watchAd}
          onRevive={revive}
          reviveBusy={result.adBusy}
        />
      )}

      {shop && (
        <Shop
          save={save}
          initialTab={shop}
          onBuyTrap={(t: TrapType) => purchase(() => buyTrap(saveRef.current, t))}
          onBuyForm={() => purchase(() => buyForm(saveRef.current))}
          onBuyFacility={(k) => purchase(() => buyFacility(saveRef.current, k))}
          onClose={() => setShop(null)}
        />
      )}

      {help && (
        <HelpModal onClose={closeHelp} />
      )}

      {import.meta.env.DEV && ad && <AdOverlay onDone={closeAd} />}
    </div>
  );
}
