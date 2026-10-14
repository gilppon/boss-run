import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "../game/bus";
import { W } from "../game/constants";
import { PortalAd } from "../game/portalAd";
import type { HudState, RunConfig, RunResult } from "../game/types";
import GameCanvas from "./GameCanvas";
import Hud from "./Hud";
import AudioMixer from "./AudioMixer";

interface Props {
  config: RunConfig;
  showHint: boolean;
  soundOn: boolean;
  musicVolume: number;
  sfxVolume: number;
  onToggleSound: () => void;
  onSetAudioVolume: (channel: "musicVolume" | "sfxVolume", value: number) => void;
  onEnd: (r: RunResult) => void;
  onGameplayReady: () => void;
  onTutorialStepComplete: () => void;
  onTutorialSkip: () => void;
  onQuit: () => void;
}

export default function PlayScreen({ config, showHint, soundOn, musicVolume, sfxVolume, onToggleSound, onSetAudioVolume, onEnd, onGameplayReady, onTutorialStepComplete, onTutorialSkip, onQuit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const portraitRef = useRef(portrait);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [ended, setEnded] = useState(false);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);
  const resumeInProgress = useRef(false);
  const orientationPauseRef = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const syncOrientation = () => {
      portraitRef.current = media.matches;
      setPortrait(media.matches);
    };
    media.addEventListener("change", syncOrientation);
    return () => media.removeEventListener("change", syncOrientation);
  }, []);

  // scale the 1280x720 HUD coordinate space to the actual canvas size
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setK(el.clientWidth / W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => bus.on("hud", (s: HudState) => setHud(s)), []);
  useEffect(
    () =>
      bus.on("end", () => {
        endedRef.current = true;
        setEnded(true);
      }),
    []
  );

  const applyPause = useCallback(async (v: boolean, reason: "user" | "focus" = "user") => {
    if (endedRef.current || pausedRef.current === v) return;
    if (v) {
      pausedRef.current = true;
      setPaused(true);
      bus.emit("pause", true);
      PortalAd.gameplayStop(reason === "focus" ? "focus" : "pause");
      return;
    }
    if (portraitRef.current || resumeInProgress.current) return;
    resumeInProgress.current = true;
    setResuming(true);
    try {
      // A commercial break belongs at an explicit pause-to-gameplay transition.
      if (reason === "user") await PortalAd.commercialBreak();
      if (endedRef.current || !pausedRef.current || portraitRef.current) return;
      pausedRef.current = false;
      setPaused(false);
      bus.emit("pause", false);
      PortalAd.gameplayStart();
    } finally {
      resumeInProgress.current = false;
      setResuming(false);
    }
  }, []);

  useEffect(() => {
    if (portrait) {
      if (!pausedRef.current && !endedRef.current) {
        orientationPauseRef.current = true;
        void applyPause(true, "focus");
      }
      return;
    }
    if (orientationPauseRef.current && pausedRef.current && !endedRef.current && hud) {
      orientationPauseRef.current = false;
      void applyPause(false, "focus");
    }
  }, [portrait, hud, applyPause]);

  const togglePause = useCallback(() => {
    if (endedRef.current) return;
    void applyPause(!pausedRef.current);
  }, [applyPause]);

  const handleGameplayReady = useCallback(() => {
    if (!pausedRef.current && !endedRef.current) onGameplayReady();
  }, [onGameplayReady]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") togglePause();
      const onHudControl = !isInteractiveTarget(e.target);
      const isSpace = e.code === "Space" || e.key === " ";
      if (onHudControl && (isSpace || ["ArrowUp", "ArrowDown"].includes(e.code))) {
        e.preventDefault();
      }
      const key = e.key.toLowerCase();
      const action = isSpace
        ? "roar"
        : e.code === "ArrowUp" || key === "w"
          ? "jump"
          : e.code === "ArrowDown" || key === "s"
            ? "crouch"
            : null;
      if (onHudControl && action && !e.repeat && !pausedRef.current && !endedRef.current) {
        bus.emit(action);
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (wrapRef.current?.contains(e.target as Node) && !isInteractiveTarget(e.target)) e.preventDefault();
    };
    const onVis = () => {
      if (document.hidden && !pausedRef.current && !endedRef.current) void applyPause(true, "focus");
    };
    window.addEventListener("keydown", onKey, true);
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("wheel", onWheel);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [togglePause, applyPause]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div
        ref={wrapRef}
        className="relative overflow-hidden"
        style={{ width: "min(100vw, calc(100dvh * 16 / 9))", aspectRatio: "16 / 9" }}
      >
        <GameCanvas config={config} onEnd={onEnd} onReady={handleGameplayReady} className="absolute inset-0" />
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ width: W, height: 720, transform: `scale(${k})` }}
        >
          <Hud
            config={config}
            hud={hud}
            uiScale={k}
            paused={paused}
            ended={ended}
            soundOn={soundOn}
            showHint={showHint}
            onTutorialStepComplete={onTutorialStepComplete}
            onTutorialSkip={onTutorialSkip}
            onPause={togglePause}
            onToggleSound={onToggleSound}
          />
          {paused && (
            <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/70">
              <div className="text-6xl font-black tracking-wider text-yellow-300 drop-shadow">PAUSED</div>
              <section
                id="pause-audio-mix-panel"
                aria-label="Audio settings"
                className="w-[340px] max-w-[calc(100%-32px)] rounded-2xl border border-orange-200/30 bg-[linear-gradient(155deg,rgba(69,24,30,0.98),rgba(17,7,15,0.98))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,225,180,0.16)] backdrop-blur-xl"
              >
                <AudioMixer
                  compact
                  musicVolume={musicVolume}
                  sfxVolume={sfxVolume}
                  soundOn={soundOn}
                  onToggleSound={onToggleSound}
                  onSetAudioVolume={onSetAudioVolume}
                />
              </section>
              <button
                disabled={resuming}
                onClick={() => void applyPause(false)}
                className="w-64 rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-2xl font-black shadow-xl hover:scale-105 disabled:opacity-60"
              >
                {resuming ? "⏳ Ad break…" : "▶ Resume"}
              </button>
              <button
                disabled={resuming}
                onClick={() => {
                  PortalAd.gameplayStop("navigation");
                  onQuit();
                }}
                className="w-64 rounded-2xl border-4 border-[#1b1020] bg-black/70 py-3 text-xl font-bold hover:bg-black disabled:opacity-60"
              >
                🏰 Main Menu
              </button>
            </div>
          )}
        </div>
      </div>
      {portrait && !ended && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#0b0309]/95 px-6 text-center backdrop-blur-sm"
          >
            <div className="w-full max-w-sm rounded-3xl border border-orange-300/35 bg-gradient-to-b from-[#32131c]/95 to-[#130810]/95 p-7 shadow-[0_16px_60px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,220,180,0.12)]">
              <div className="relative mx-auto mb-5 flex h-28 w-36 items-center justify-center">
                <div className="h-[4.5rem] w-12 -translate-x-3 -rotate-12 rounded-xl border-2 border-white/45 bg-white/5 shadow-[0_8px_22px_rgba(0,0,0,0.55)]" />
                <div className="absolute h-[4.5rem] w-12 translate-x-4 rotate-90 rounded-xl border-2 border-orange-300 bg-orange-300/10 shadow-[0_0_26px_rgba(251,146,60,0.28)]" />
                <div className="absolute -bottom-1 rounded-full border border-orange-200/30 bg-[#1c0b12] px-3 py-1 text-2xl font-black text-orange-200 shadow-lg">↻</div>
              </div>
              <div className="text-xs font-black tracking-[0.3em] text-orange-200/70">THE ARENA IS PAUSED</div>
              <h2 className="mt-2 text-2xl font-black tracking-wide text-white">ROTATE TO LANDSCAPE</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Turn your device sideways. Your run will resume automatically.
              </p>
            </div>
          </div>
      )}
    </div>
  );
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest("button, input, select, textarea, [contenteditable='true']"));
}
