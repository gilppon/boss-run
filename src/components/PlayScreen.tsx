import { useCallback, useEffect, useRef, useState } from "react";
import { bus } from "../game/bus";
import { W } from "../game/constants";
import { Poki } from "../game/poki";
import type { HudState, RunConfig, RunResult } from "../game/types";
import GameCanvas from "./GameCanvas";
import Hud from "./Hud";

interface Props {
  config: RunConfig;
  showHint: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onEnd: (r: RunResult) => void;
  onQuit: () => void;
}

export default function PlayScreen({ config, showHint, soundOn, onToggleSound, onEnd, onQuit }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const [hud, setHud] = useState<HudState | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const pausedRef = useRef(false);
  const endedRef = useRef(false);

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
    pausedRef.current = v;
    setPaused(v);
    bus.emit("pause", v);
    if (v) Poki.gameplayStop();
    else Poki.gameplayStart();
  }, []);

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
    </div>
  );
}
