import { useEffect, useRef, useState } from "react";
import { TRAP_DEFS } from "../game/config";
import { bus } from "../game/bus";
import type { HudState, RunConfig } from "../game/types";
import { TRAP_TYPES } from "../game/types";
import BossPortrait from "./BossPortrait";

interface Props {
  config: RunConfig;
  hud: HudState | null;
  paused: boolean;
  ended: boolean;
  soundOn: boolean;
  showHint: boolean;
  onPause: () => void;
  onToggleSound: () => void;
}

function Bar({
  pct,
  from,
  to,
  height = 18,
}: {
  pct: number;
  from: string;
  to: string;
  height?: number;
}) {
  return (
    <div
      className="w-full overflow-hidden rounded-full border-2 border-[#1b1020] bg-black/60"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-100"
        style={{
          width: `${Math.max(0, Math.min(1, pct)) * 100}%`,
          background: `linear-gradient(90deg, ${from}, ${to})`,
        }}
      />
    </div>
  );
}

export default function Hud({ config, hud, paused, ended, soundOn, showHint, onPause, onToggleSound }: Props) {
  // First-run mission: detect 1 trap placed → celebrate for 5s (hooks before the early return)
  const placed = hud?.trapsPlaced ?? 0;
  const didRef = useRef(false);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    if (placed >= 1 && !didRef.current) {
      didRef.current = true;
      setCelebrate(true);
      const id = window.setTimeout(() => setCelebrate(false), 5000);
      return () => window.clearTimeout(id);
    }
  }, [placed]);

  if (!hud) return null;
  const danger = hud.started && !ended && hud.gap < 230;
  const roarReady = hud.roarCd <= 0;
  const roarPct = hud.roarMax > 0 ? 1 - hud.roarCd / hud.roarMax : 1;
  const heroPct = hud.heroHp / hud.heroMaxHp;

  return (
    <div className="absolute inset-0 select-none text-white" style={{ fontFamily: "inherit" }}>
      {danger && (
        <div className="danger-pulse absolute inset-0" style={{ boxShadow: "inset 0 0 120px 30px rgba(255,30,30,0.55)" }}>
          <div className="absolute left-1/2 top-[150px] -translate-x-1/2 rounded-full bg-red-600/90 px-6 py-1 text-2xl font-black tracking-wide shadow-lg">
            ⚠ He's on top of you! ROAR!
          </div>
        </div>
      )}

      {/* top-left: boss HP */}
      <div className="absolute left-5 top-4 flex w-[380px] items-center gap-3">
        <div className="rounded-2xl border-2 border-[#1b1020] bg-black/50 p-1">
          <BossPortrait form={config.boss.form} size={64} />
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-baseline justify-between text-sm font-bold">
            <span className="text-lg font-black text-rose-300 drop-shadow">{config.boss.def.name}</span>
            <span className="tabular-nums text-white/90">
              {Math.ceil(hud.bossHp)} / {hud.bossMaxHp}
            </span>
          </div>
          <Bar pct={hud.bossHp / hud.bossMaxHp} from="#ff5a5a" to="#c0313f" height={20} />
        </div>
      </div>

      {/* top-right: hero HP */}
      <div className="absolute right-5 top-4 flex w-[380px] flex-row-reverse items-center gap-3 pr-[110px]">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-[#1b1020] bg-black/50 text-4xl">
          🧑‍🔧
        </div>
        <div className="flex-1">
          <div className="mb-1 flex items-baseline justify-between text-sm font-bold">
            <span className="tabular-nums text-white/90">
              {Math.ceil(hud.heroHp)} / {hud.heroMaxHp}
            </span>
            <span className="text-lg font-black text-emerald-300 drop-shadow">{hud.heroName}</span>
          </div>
          <Bar
            pct={heroPct}
            from={heroPct > 0.5 ? "#86efac" : heroPct > 0.25 ? "#fde047" : "#fca5a5"}
            to={heroPct > 0.5 ? "#16a34a" : heroPct > 0.25 ? "#ca8a04" : "#dc2626"}
            height={20}
          />
        </div>
      </div>

      {/* top-right buttons */}
      <div className="pointer-events-auto absolute right-5 top-4 flex gap-2">
        <button
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleSound();
          }}
          className="h-[34px] w-[34px] rounded-lg border-2 border-[#1b1020] bg-black/60 text-base hover:bg-black/80"
          title="Sound"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        {!ended && (
          <button
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            className="h-[34px] w-[34px] rounded-lg border-2 border-[#1b1020] bg-black/60 text-base hover:bg-black/80"
            title="Pause (Esc)"
          >
            {paused ? "▶" : "⏸"}
          </button>
        )}
      </div>

      {/* top-center: progress */}
      <div className="absolute left-1/2 top-[100px] w-[460px] -translate-x-1/2">
        <div className="relative h-3 rounded-full border-2 border-[#1b1020] bg-black/60">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-orange-500 to-yellow-300 opacity-70"
            style={{ width: `${hud.bossProgress * 100}%` }}
          />
          <div className="absolute -top-[13px] text-2xl" style={{ left: `calc(${hud.heroProgress * 100}% - 12px)` }}>
            🧑‍🔧
          </div>
          <div className="absolute -top-[16px] text-3xl" style={{ left: `calc(${hud.bossProgress * 100}% - 14px)` }}>
            👹
          </div>
          <div className="absolute -right-3 -top-[14px] text-2xl">🚪</div>
        </div>
        <div className="mt-2 text-center text-xs font-bold tracking-widest text-white/60">
          {hud.started ? `${hud.time.toFixed(1)}s  ·  ${Math.round((1 - hud.bossProgress) * 100)}% to the gate` : "Get ready…"}
        </div>
      </div>

      {hud.combo >= 2 && (
        <div className="absolute left-1/2 top-[152px] -translate-x-1/2 text-3xl font-black text-yellow-300 drop-shadow-[0_3px_0_#1b1020]">
          COMBO ×{hud.combo}
        </div>
      )}

      {/* bottom-left: mana */}
      <div className="absolute bottom-5 left-5 w-[300px]">
        <div className="mb-1 flex items-baseline justify-between text-sm font-bold">
          <span className="text-lg font-black text-violet-300">💜 Mana</span>
          <span className="tabular-nums">
            {Math.floor(hud.mana)} / {hud.maxMana}
          </span>
        </div>
        <Bar pct={hud.mana / hud.maxMana} from="#c084fc" to="#6366f1" height={22} />
      </div>

      {/* bottom-center: trap select */}
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
        {TRAP_TYPES.map((t) => {
          const d = TRAP_DEFS[t];
          const st = config.traps[t];
          const locked = !st.unlocked;
          const sel = hud.selected === t;
          const afford = hud.mana >= st.cost;
          return (
            <button
              key={t}
              tabIndex={-1}
              disabled={locked}
              onClick={(e) => {
                e.currentTarget.blur();
                bus.emit("select", t);
              }}
              className={[
                "relative w-[150px] rounded-2xl border-[3px] px-3 py-2 text-left transition",
                sel
                  ? "scale-105 border-yellow-300 bg-gradient-to-b from-[#4a1d3a] to-[#2a0f24] shadow-[0_0_24px_rgba(255,214,80,0.5)]"
                  : "border-[#1b1020] bg-black/65 hover:bg-black/80",
                locked ? "opacity-45 grayscale" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span className="text-3xl leading-none">{locked ? "🔒" : d.icon}</span>
                <div className="leading-tight">
                  <div className="text-base font-black">{d.short}</div>
                  <div className={`text-sm font-bold tabular-nums ${afford ? "text-violet-300" : "text-rose-400"}`}>
                    💜 {st.cost}
                  </div>
                </div>
              </div>
              <div className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center rounded-md border-2 border-[#1b1020] bg-yellow-300 text-xs font-black text-black">
                {d.hotkey}
              </div>
              {!locked && (
                <div className="mt-1 text-[11px] font-bold text-white/60">
                  Lv.{st.level} · DMG {st.damage}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* bottom-right: roar */}
      <div className="pointer-events-auto absolute bottom-4 right-5">
        <button
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            bus.emit("roar");
          }}
          disabled={!roarReady}
          className={[
            "relative flex h-[92px] w-[176px] flex-col items-center justify-center overflow-hidden rounded-2xl border-[3px] font-black transition",
            roarReady
              ? "border-yellow-300 bg-gradient-to-b from-orange-500 to-red-700 shadow-[0_0_28px_rgba(255,140,40,0.7)] hover:scale-105"
              : "border-[#1b1020] bg-black/70 text-white/60",
          ].join(" ")}
        >
          {!roarReady && (
            <div
              className="absolute inset-x-0 bottom-0 bg-orange-500/35"
              style={{ height: `${roarPct * 100}%` }}
            />
          )}
          <span className="relative text-3xl leading-none">🗣️</span>
          <span className="relative text-lg">ROAR [Space]</span>
          <span className="relative text-xs font-bold text-white/80">
            {roarReady ? "SEND HIM PACKING!" : `${hud.roarCd.toFixed(1)}s`}
          </span>
        </button>
      </div>

      {showHint && !ended && placed < 1 && (
        <div className="absolute bottom-[132px] left-1/2 -translate-x-1/2 rounded-2xl border-2 border-yellow-300/70 bg-black/70 px-6 py-3 text-center text-lg font-bold text-yellow-100 shadow-xl">
          🎯 <b className="text-yellow-300">MISSION</b> · <b className="text-emerald-300">click or drag</b> in the green zone ahead of
          the hero to place a trap!
          <br />
          <span className="text-sm text-white/70">
            The wider the lava, the higher he jumps · Get close? Press <b>Space</b> to roar
          </span>
        </div>
      )}
      {showHint && !ended && celebrate && (
        <div className="absolute bottom-[132px] left-1/2 -translate-x-1/2 rounded-2xl border-2 border-emerald-300/70 bg-black/70 px-6 py-3 text-center text-lg font-bold text-emerald-100 shadow-xl">
          ✅ Mission complete! Now block him all the way!
        </div>
      )}
    </div>
  );
}
