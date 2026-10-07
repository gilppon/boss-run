import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "../game/bus";
import { W } from "../game/constants";
import { Poki } from "../game/poki";
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
  onQuit: () => void;
}

export default function PlayScreen({ config, showHint, soundOn, musicVolume, sfxVolume, onToggleSound, onSetAudioVolume, onEnd, onQuit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const portraitRef = useRef(portrait);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);

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

  const applyPause = useCallback((v: boolean) => {
    if (!v && portraitRef.current) return;
    if (endedRef.current || pausedRef.current === v) return;
    pausedRef.current = v;
    setPaused(v);
    bus.emit("pause", v);
    if (v) Poki.gameplayStop();
    else Poki.gameplayStart();
  }, []);

  useEffect(() => {
    if (!portrait) return;
    if (!pausedRef.current && !endedRef.current) applyPause(true);
  }, [portrait, applyPause]);

  const togglePause = useCallback(() => {
    if (endedRef.current) return;
    applyPause(!pausedRef.current);
  }, [applyPause]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") togglePause();
    };
    const onVis = () => {
      if (document.hidden && !pausedRef.current && !endedRef.current) applyPause(true);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("keydown", onKey);
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
        <GameCanvas config={config} onEnd={onEnd} className="absolute inset-0" />
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
                onClick={() => applyPause(false)}
                className="w-64 rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-2xl font-black shadow-xl hover:scale-105"
              >
                ▶ Resume
              </button>
              <button
                onClick={() => {
                  Poki.gameplayStop();
                  onQuit();
                }}
                className="w-64 rounded-2xl border-4 border-[#1b1020] bg-black/70 py-3 text-xl font-bold hover:bg-black"
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
                Turn your device sideways, then tap <span className="font-bold text-orange-200">Resume</span> to continue the run.
              </p>
            </div>
          </div>
      )}
    </div>
  );
}
