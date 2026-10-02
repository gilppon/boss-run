import { useCallback, useEffect, useRef, useState } from "react";
import AdOverlay, { type AdState } from "./components/AdOverlay";
import HelpModal from "./components/HelpModal";
import MainMenu from "./components/MainMenu";
import PlayScreen from "./components/PlayScreen";
import ResultModal, { type ResultInfo } from "./components/ResultModal";
import Shop, { type ShopTab } from "./components/Shop";
import { FLOORS } from "./game/config";
import { Poki, registerAdUI } from "./game/poki";
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
import { sfx, startMusic } from "./game/sfx";
import type { RunConfig, RunResult, SaveData, TrapType } from "./game/types";

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

  const saveRef = useRef(save);
  saveRef.current = save;
  const cfgRef = useRef<RunConfig | null>(null);
  cfgRef.current = runCfg;
  const resultRef = useRef<ResultInfo | null>(null);
  resultRef.current = result;
  const adRef = useRef<AdState | null>(null);
  const sessionRuns = useRef(0);
  const starting = useRef(false);

  // Persist save & sync sound/fx settings
  useEffect(() => {
    persistSave(save);
    sfx.setEnabled(save.soundOn);
    setFxQuality(save.lowFx);
  }, [save]);

  // Poki SDK init + mock ad UI registration
  useEffect(() => {
    registerAdUI((kind, done) => {
      const a: AdState = { kind, done };
      adRef.current = a;
      setAd(a);
    });
    Poki.init().then(() => Poki.loadingFinished());
    return () => registerAdUI(null);
  }, []);

  // Show help automatically on first visit
  useEffect(() => {
    if (!saveRef.current.seenTutorial) setHelp(true);
  }, []);

  const closeAd = useCallback((ok: boolean) => {
    const a = adRef.current;
    adRef.current = null;
    setAd(null);
    a?.done(ok);
  }, []);

  const startRun = useCallback(async (floorIdx: number, opts?: { heroHpScale?: number }) => {
    if (starting.current) return;
    starting.current = true;
    try {
      sfx.unlock();
      // Music needs the same first gesture as the AudioContext itself.
      startMusic();
      setShop(null);
      setHelp(false);
      sessionRuns.current += 1;
      // Only show a commercial ad at a natural breather between runs (every 3rd)
      if (sessionRuns.current > 1 && (sessionRuns.current - 1) % 3 === 0) {
        await Poki.commercialBreak();
      }
      const s = saveRef.current;
      const idx = Math.min(floorIdx, s.cleared, FLOORS.length - 1);
      setShowHint(!s.seenTutorial);
      setSave((p) => ({ ...p, selectedFloor: idx, seenTutorial: true }));
      setResult(null);
      const cfg = buildRunConfig(s, idx);
      if (opts?.heroHpScale) cfg.heroHpScale = opts.heroHpScale;
      setRunCfg(cfg);
      setRunKey((k) => k + 1);
      setScreen("play");
      Poki.gameplayStart();
    } finally {
      starting.current = false;
    }
  }, []);

  const handleEnd = useCallback((r: RunResult) => {
    Poki.gameplayStop();
    const cfg = cfgRef.current;
    if (!cfg) return;
    const s = saveRef.current;
    const idx = cfg.floorIndex;
    const reward = computeReward(s, idx, r);
    const unlockedNext = r.won && s.cleared === idx && idx + 1 < FLOORS.length;
    setSave(applyRunEnd(s, idx, r, reward.total));
    setResult({ r, reward, floorIndex: idx, adClaimed: false, unlockedNext, adBusy: false });
  }, []);

  const watchAd = useCallback(async () => {
    const cur = resultRef.current;
    if (!cur || cur.adClaimed || cur.adBusy) return;
    setResult({ ...cur, adBusy: true });
    const ok = await Poki.rewardedBreak();
    if (ok) {
      setSave((p) => addGems(p, cur.reward.total));
      sfx.coin();
      setResult((r) => (r ? { ...r, adClaimed: true, adBusy: false } : r));
    } else {
      setResult((r) => (r ? { ...r, adBusy: false } : r));
    }
  }, []);

  // Revive on defeat: watch an ad -> restart the same floor with the hero at 50% HP (once per result)
  const revive = useCallback(async () => {
    const cur = resultRef.current;
    if (!cur || cur.r.won || cur.adBusy) return;
    setResult({ ...cur, adBusy: true });
    const ok = await Poki.rewardedBreak();
    if (ok) {
      sfx.go();
      startRun(cur.floorIndex, { heroHpScale: 0.5 });
    } else {
      setResult((r) => (r ? { ...r, adBusy: false } : r));
    }
  }, [startRun]);

  const toMenu = useCallback(() => {
    setResult(null);
    setRunCfg(null);
    setScreen("menu");
  }, []);

  const closeHelp = useCallback(() => {
    setHelp(false);
    setSave((p) => (p.seenTutorial ? p : { ...p, seenTutorial: true }));
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
        // Unmuting is a gesture: (re)start the loop if it never got going.
        if (next) startMusic();
        return { ...p, soundOn: next };
      }),
    [],
  );
  const toggleFx = useCallback(() => setSave((p) => ({ ...p, lowFx: !p.lowFx })), []);

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
          onStart={startRun}
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
          onToggleFx={toggleFx}
          onReset={() => {
            setSave(resetSave());
            sessionRuns.current = 0;
          }}
        />
      )}

      {screen === "play" && runCfg && (
        <PlayScreen
          key={runKey}
          config={runCfg}
          showHint={showHint}
          soundOn={save.soundOn}
          onToggleSound={toggleSound}
          onEnd={handleEnd}
          onQuit={toMenu}
        />
      )}

      {screen === "play" && result && (
        <ResultModal
          info={result}
          onRetry={() => startRun(result.floorIndex)}
          onNext={() => startRun(result.floorIndex + 1)}
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

      {ad && <AdOverlay kind={ad.kind} onDone={closeAd} />}
    </div>
  );
}
