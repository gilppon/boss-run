import { useEffect, useState } from "react";
import { bgUrl } from "../game/assets";
import { BOSS_FORMS, FLOORS, HERO_CHARACTERS } from "../game/config";
import { DAILY_REWARDS, dailyStatus, pendingMine } from "../game/progression";
import type { RunMode, SaveData } from "../game/types";
import BossPortrait from "./BossPortrait";
import HeroPortrait from "./HeroPortrait";
import AudioMixer from "./AudioMixer";
import type { ShopTab } from "./Shop";

interface Props {
  save: SaveData;
  onStart: (floor: number, mode: RunMode) => void;
  onSelectFloor: (i: number) => void;
  onShop: (tab?: ShopTab) => void;
  onHelp: () => void;
  onCollect: () => void;
  onClaimDaily: () => void;
  onToggleSound: () => void;
  onSetAudioVolume: (channel: "musicVolume" | "sfxVolume", value: number) => void;
  onToggleFx: () => void;
  onReset: () => void;
}

function StatBar({ label, pct, color, value }: { label: string; pct: number; color: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold">
      <span className="w-16 text-white/60">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/50">
        <div className="h-full rounded-full" style={{ width: `${Math.min(1, pct) * 100}%`, background: color }} />
      </div>
      <span className="w-14 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function MainMenu({
  save,
  onStart,
  onSelectFloor,
  onShop,
  onHelp,
  onCollect,
  onClaimDaily,
  onToggleSound,
  onSetAudioVolume,
  onToggleFx,
  onReset,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [showReset, setShowReset] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [runMode, setRunMode] = useState<RunMode>("standard");
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 2000);
    return () => window.clearInterval(id);
  }, []);

  const form = BOSS_FORMS[save.bossForm];
  const nextForm = BOSS_FORMS[save.bossForm + 1];
  const canEvolve = !!nextForm && save.gems >= nextForm.cost;
  const pending = pendingMine(save, now);
  const daily = dailyStatus(save, now);
  const selected = Math.min(save.selectedFloor, save.cleared, FLOORS.length - 1);
  const floor = FLOORS[selected];
  const canUpgradeSomething = save.gems >= 60;

  const maxOf = (key: "maxHp" | "maxMana" | "manaRegen" | "roarPower") =>
    Math.max(...BOSS_FORMS.map((f) => f[key]));

  return (
    <div
      className="relative h-full overflow-y-auto"
      style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/85" />
      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-4 sm:py-6">
        {/* top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full border-2 border-violet-400/60 bg-black/60 px-5 py-1.5 text-xl font-black tabular-nums text-violet-200 shadow-lg">
            💎 {save.gems.toLocaleString("en-US")}
            <span className="text-xs font-bold text-white/40">GEMS</span>
          </div>
          <div className="flex items-center gap-2">
            {save.facilities.mine > 0 && (
              <button
                onClick={onCollect}
                disabled={pending <= 0}
                className={`rounded-full border-2 border-[#1b1020] px-4 py-1.5 text-sm font-black transition ${
                  pending > 0
                    ? "animate-pulse bg-gradient-to-b from-emerald-400 to-emerald-700 hover:brightness-110"
                    : "bg-black/50 text-white/40"
                }`}
              >
                ⛏️ Mine {pending > 0 ? `+${pending.toLocaleString("en-US")} gems` : "filling"}
              </button>
            )}
            <button
              onClick={onClaimDaily}
              disabled={!daily.available}
              title={DAILY_REWARDS.map((v, i) => `Day ${i + 1}: ${v} gems`).join(" · ")}
              className={`rounded-full border-2 border-[#1b1020] px-4 py-1.5 text-sm font-black transition ${
                daily.available
                  ? "animate-pulse bg-gradient-to-b from-amber-300 to-orange-600 text-black hover:brightness-110"
                  : "bg-black/50 text-white/40"
              }`}
            >
              🎁{" "}
              {daily.available
                ? `+${daily.amount} gems (Day ${daily.streakDay})`
                : `Day ${daily.streakDay} claimed`}
            </button>
            <button onClick={onHelp} className="rounded-full border-2 border-[#1b1020] bg-black/60 px-4 py-1.5 text-sm font-bold hover:bg-black/80">
              ❓ How to play
            </button>
            <button
              onClick={() => setAudioOpen((open) => !open)}
              aria-expanded={audioOpen}
              aria-controls="audio-mix-panel"
              className="rounded-full border-2 border-[#1b1020] bg-black/60 px-3 py-1.5 text-sm shadow-[0_4px_14px_rgba(0,0,0,0.4)] transition hover:-translate-y-0.5 hover:bg-black/80"
            >
              🎚 Audio
            </button>
            <button
              onClick={onToggleFx}
              title={save.lowFx ? "Lean effects on" : "Full effects"}
              className={`rounded-full border-2 border-[#1b1020] px-3 py-1.5 text-sm hover:bg-black/80 ${
                save.lowFx ? "bg-emerald-700" : "bg-black/60"
              }`}
            >
              {save.lowFx ? "✨ Lean" : "✨ Full"}
            </button>
          </div>
        </div>

        {audioOpen && (
          <div className="mt-3 flex justify-end">
            <div
              id="audio-mix-panel"
              className="w-72 rounded-2xl border border-orange-200/30 bg-[linear-gradient(155deg,rgba(69,24,30,0.98),rgba(17,7,15,0.98))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.72),inset_0_1px_0_rgba(255,225,180,0.16)] backdrop-blur-xl"
            >
              <AudioMixer
                musicVolume={save.musicVolume}
                sfxVolume={save.sfxVolume}
                soundOn={save.soundOn}
                onToggleSound={onToggleSound}
                onSetAudioVolume={onSetAudioVolume}
              />
            </div>
          </div>
        )}

        {/* title */}
        <header className="mt-4 text-center sm:mt-6">
          <div className="text-xs font-bold tracking-[0.5em] text-orange-300/80">REVERSE PRINCESS</div>
          <h1 className="title-glow mt-1 text-5xl font-black leading-none tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-b from-yellow-200 via-orange-400 to-red-600 bg-clip-text text-transparent">
              REVERSE BOSS
            </span>
            <br className="sm:hidden" />
            <span className="ml-0 bg-gradient-to-b from-rose-300 via-red-500 to-red-900 bg-clip-text text-transparent sm:ml-4">
              RUNNER
            </span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/75 sm:text-base">
            A hero is coming to save the princess? This time <b className="text-rose-300">you're the demon</b>.
            <br />
            Lay <b className="text-orange-300">lava, spikes and minions</b> in his path and wipe him out!
          </p>
        </header>

        {/* main grid */}
        <main className="mt-5 grid flex-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* boss card */}
          <section className="rounded-3xl border-4 border-[#1b1020] bg-black/55 p-4 shadow-2xl backdrop-blur-sm">
            <div className="relative flex justify-center">
              <div className="float-y">
                <BossPortrait form={save.bossForm} size={200} />
              </div>
              {canEvolve && (
                <button
                  onClick={() => onShop("boss")}
                  className="absolute right-0 top-0 animate-bounce rounded-full border-2 border-[#1b1020] bg-yellow-300 px-3 py-1 text-xs font-black text-black shadow-lg"
                >
                  ⬆ Evolve!
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">{form.name}</div>
              <div className="text-xs tracking-[0.3em] text-white/40">{form.title.toUpperCase()}</div>
            </div>
            <div className="mt-3 space-y-1.5">
              <StatBar label="HP" pct={form.maxHp / maxOf("maxHp")} color="#f87171" value={`${form.maxHp}`} />
              <StatBar
                label="Mana"
                pct={(form.maxMana + 12 * save.facilities.well) / (maxOf("maxMana") + 60)}
                color="#a78bfa"
                value={`${form.maxMana + 12 * save.facilities.well}`}
              />
              <StatBar
                label="Regen"
                pct={(form.manaRegen + 1.2 * save.facilities.well) / (maxOf("manaRegen") + 6)}
                color="#60a5fa"
                value={`${(form.manaRegen + 1.2 * save.facilities.well).toFixed(1)}/s`}
              />
              <StatBar label="Roar" pct={form.roarPower / maxOf("roarPower")} color="#fb923c" value={`×${form.roarPower}`} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onShop("trap")}
                className={`rounded-xl border-[3px] border-[#1b1020] bg-gradient-to-b from-sky-500 to-indigo-700 py-2 text-sm font-black hover:brightness-110 ${
                  canUpgradeSomething ? "ring-2 ring-yellow-300/70" : ""
                }`}
              >
                🛒 Upgrade
              </button>
              <button
                onClick={() => onShop("dungeon")}
                className="rounded-xl border-[3px] border-[#1b1020] bg-gradient-to-b from-emerald-500 to-teal-700 py-2 text-sm font-black hover:brightness-110"
              >
                🏰 Expand
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">Runs</div>
                <div className="text-base font-black tabular-nums">{save.stats.runs.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">Heroes Slain</div>
                <div className="text-base font-black tabular-nums">{save.stats.heroesDefeated.toLocaleString("en-US")}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">Total 💎</div>
                <div className="text-base font-black tabular-nums">{save.totalEarned.toLocaleString("en-US")}</div>
              </div>
            </div>
          </section>

          {/* floor select */}
          <section className="flex flex-col rounded-3xl border-4 border-[#1b1020] bg-black/55 p-4 shadow-2xl backdrop-blur-sm">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-yellow-200">
              🗺️ Dungeon — pick the hero's floor
            </h2>
            <div className="grid flex-1 gap-2">
              {FLOORS.map((f, i) => {
                const open = i <= save.cleared;
                const cleared = i < save.cleared;
                const sel = i === selected;
                return (
                  <button
                    key={f.id}
                    disabled={!open}
                    onClick={() => onSelectFloor(i)}
                    className={`group flex items-center gap-3 rounded-2xl border-[3px] p-3 text-left transition ${
                      sel
                        ? "border-yellow-300 bg-gradient-to-r from-[#5a2440] to-[#2a1030] shadow-[0_0_24px_rgba(255,214,80,0.25)]"
                        : "border-[#1b1020] bg-black/40 hover:bg-black/60"
                    } ${!open ? "opacity-45" : ""}`}
                  >
                    <div className="relative h-12 w-12 shrink-0">
                      <HeroPortrait id={f.heroId} size={48} className={open ? "" : "grayscale opacity-60"} />
                      <span className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[#1b1020] text-[10px] font-black ${open ? "bg-yellow-300 text-black" : "bg-slate-500 text-white"}`}>
                        {open ? i + 1 : "🔒"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-black">{f.name}</span>
                        <span className="text-xs text-white/40">{f.sub}</span>
                      </div>
                      <div className="truncate text-xs text-white/60">{f.desc}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold">
                        <span className="text-emerald-300">{HERO_CHARACTERS[f.heroId].name}</span>
                        <span className="text-emerald-100/50">{HERO_CHARACTERS[f.heroId].title}</span>
                        <span className="text-rose-300">HP {f.heroHp}</span>
                        <span className="text-sky-300">Length {(f.length / 100).toFixed(0)}m</span>
                        <span className="text-violet-300">💎 {f.reward}+</span>
                      </div>
                    </div>
                    <div className="text-right text-xs font-bold">
                      {cleared ? <span className="text-emerald-300">✅ Cleared</span> : open ? <span className="text-orange-300">Open</span> : <span className="text-white/40">Clear the floor above</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <section className="mt-4 rounded-2xl border-2 border-[#1b1020] bg-[#120810]/90 p-3 shadow-[inset_0_1px_0_rgba(255,220,180,0.08)]" aria-label="Run mode">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-xs font-black tracking-[0.22em] text-white/55">CHOOSE YOUR RUN</h3>
                <span className="text-[10px] font-bold text-orange-200/70">REPLAY CONTRACT</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={runMode === "standard"}
                  onClick={() => setRunMode("standard")}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition active:translate-y-0.5 ${runMode === "standard" ? "border-yellow-300/80 bg-gradient-to-b from-[#4b3020] to-[#26151a] shadow-[0_3px_0_#10070b]" : "border-[#35232b] bg-black/35 hover:bg-white/5"}`}
                >
                  <span className="block text-sm font-black text-yellow-100">⚔ Standard</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-white/50">All abilities · base rewards</span>
                </button>
                <button
                  type="button"
                  aria-pressed={runMode === "no-roar-trial"}
                  onClick={() => setRunMode("no-roar-trial")}
                  className={`rounded-xl border-2 px-3 py-2 text-left transition active:translate-y-0.5 ${runMode === "no-roar-trial" ? "border-orange-300 bg-gradient-to-b from-[#71351c] to-[#35151b] shadow-[0_0_18px_rgba(251,146,60,0.2)]" : "border-[#35232b] bg-black/35 hover:bg-white/5"}`}
                >
                  <span className="block text-sm font-black text-orange-100">🗣️ No Roar Trial</span>
                  <span className="mt-0.5 block text-[10px] font-bold text-orange-100/65">Roar sealed · +25% rewards</span>
                </button>
              </div>
            </section>
            <button
              onClick={() => onStart(selected, runMode)}
              className="start-btn mt-4 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 via-red-500 to-red-700 py-4 text-2xl font-black tracking-wide shadow-[0_6px_0_#5a0f14] transition hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#5a0f14]"
            >
              ⚔️ DEPLOY! — {floor.sub}{runMode === "no-roar-trial" ? " · TRIAL" : ""}
            </button>
          </section>
        </main>

        <footer className="mt-4 flex items-center justify-between text-xs text-white/40">
          <span>Click / drag · 1·2·3 pick a trap · {runMode === "no-roar-trial" ? "No Roar Trial seals Space" : "Space to roar"}</span>
          <button onClick={() => setShowReset(true)} className="underline decoration-dotted hover:text-white/70">
            Reset progress
          </button>
        </footer>
      </div>

      {/* reset confirm modal (window.confirm is blocked in portal iframes, so we use in-game UI) */}
      {showReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowReset(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-[#1b1020] bg-gradient-to-b from-[#2a1030] to-[#12060f] p-6 text-center shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="mt-2 text-xl font-black text-white">Reset your progress?</h2>
            <p className="mt-1 text-sm text-white/60">
              Every gem, trap and dungeon record is lost forever.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowReset(false)}
                className="rounded-xl border-2 border-[#1b1020] bg-white/10 py-2.5 font-black text-white hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowReset(false);
                  onReset();
                }}
                className="rounded-xl border-2 border-[#1b1020] bg-gradient-to-b from-red-500 to-red-700 py-2.5 font-black text-white hover:brightness-110"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
