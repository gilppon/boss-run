import { useState } from "react";
import {
  BOSS_FORMS,
  FACILITIES,
  FLOORS,
  MAX_FACILITY_LEVEL,
  MAX_TRAP_LEVEL,
  TRAP_DEFS,
} from "../game/config";
import { facilityCost, MINE_RATE, trapStats, trapUpgradeCost } from "../game/progression";
import type { SaveData, TrapType } from "../game/types";
import { TRAP_TYPES } from "../game/types";
import BossPortrait from "./BossPortrait";

export type ShopTab = "trap" | "boss" | "dungeon";

interface Props {
  save: SaveData;
  initialTab?: ShopTab;
  onBuyTrap: (t: TrapType) => void;
  onBuyForm: () => void;
  onBuyFacility: (k: "mine" | "well" | "vault") => void;
  onClose: () => void;
}

function Pips({ level, max }: { level: number; max: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`h-2.5 w-6 rounded-sm border border-[#1b1020] ${
            i < level ? "bg-gradient-to-r from-yellow-300 to-orange-500" : "bg-black/50"
          }`}
        />
      ))}
    </div>
  );
}

function BuyButton({
  cost,
  gems,
  label,
  onClick,
}: {
  cost: number | null;
  gems: number;
  label: string;
  onClick: () => void;
}) {
  if (cost === null) {
    return (
      <div className="rounded-xl border-2 border-yellow-300/60 bg-yellow-300/10 px-4 py-2 text-center font-black text-yellow-200">
        MAX
      </div>
    );
  }
  const ok = gems >= cost;
  return (
    <button
      onClick={onClick}
      disabled={!ok}
      className={`rounded-xl border-[3px] border-[#1b1020] px-4 py-2 font-black transition ${
        ok
          ? "bg-gradient-to-b from-emerald-400 to-emerald-700 hover:brightness-110 active:scale-95"
          : "bg-black/50 text-white/40"
      }`}
    >
      {label} · 💎 {cost}
    </button>
  );
}

export default function Shop({ save, initialTab = "trap", onBuyTrap, onBuyForm, onBuyFacility, onClose }: Props) {
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const tabs: Array<[ShopTab, string]> = [
    ["trap", "🪤 Trap Upgrades"],
    ["boss", "👹 Boss Evolve"],
    ["dungeon", "🏰 Dungeon"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3" onClick={onClose}>
      <div
        className="pop-in flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-4 border-[#1b1020] bg-gradient-to-b from-[#2c1230] to-[#160a1c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <h2 className="text-2xl font-black text-yellow-300">🛒 Demon Forge</h2>
          <div className="flex items-center gap-3">
            <div className="rounded-full border-2 border-violet-400/60 bg-black/50 px-4 py-1 text-lg font-black tabular-nums text-violet-200">
              💎 {save.gems.toLocaleString()}
            </div>
            <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-lg hover:bg-white/20">
              ✕
            </button>
          </div>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {tabs.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex-1 rounded-t-xl border-2 border-b-0 border-[#1b1020] px-2 py-2 text-sm font-black transition sm:text-base ${
                tab === k ? "bg-[#4a1d3a] text-yellow-200" : "bg-black/40 text-white/60 hover:bg-black/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto bg-[#4a1d3a]/40 p-4">
          {tab === "trap" && (
            <div className="grid gap-3">
              {TRAP_TYPES.map((t) => {
                const d = TRAP_DEFS[t];
                const lvl = save.trapLevels[t];
                const cur = trapStats(t, lvl);
                const nextLvl = Math.min(lvl + 1, MAX_TRAP_LEVEL);
                const nxt = trapStats(t, nextLvl);
                const cost = trapUpgradeCost(t, lvl);
                return (
                  <div key={t} className="flex flex-col gap-3 rounded-2xl border-2 border-[#1b1020] bg-black/35 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/40 text-4xl">
                      {d.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xl font-black">{d.name}</span>
                        <Pips level={lvl} max={MAX_TRAP_LEVEL} />
                        {lvl === 0 && <span className="rounded bg-rose-500/80 px-2 text-xs font-bold">LOCKED</span>}
                      </div>
                      <p className="mt-1 text-sm text-white/65">{d.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
                        <span className="text-rose-300">
                          DMG {lvl > 0 ? cur.damage : "-"}
                          {lvl < MAX_TRAP_LEVEL && <span className="text-emerald-300"> → {nxt.damage}</span>}
                        </span>
                        <span className="text-violet-300">Mana {d.baseCost}</span>
                        {t === "Minion" && (
                          <>
                            <span className="text-orange-300">
                              HP {lvl > 0 ? cur.hp : "-"}
                              {lvl < MAX_TRAP_LEVEL && nxt.hp !== cur.hp && (
                                <span className="text-emerald-300"> → {nxt.hp}</span>
                              )}
                            </span>
                            <span className="text-sky-300">
                              Rate {lvl > 0 ? cur.fireInterval.toFixed(2) : "-"}s
                              {lvl < MAX_TRAP_LEVEL && <span className="text-emerald-300"> → {nxt.fireInterval.toFixed(2)}s</span>}
                            </span>
                            {(lvl + 1 >= 3 || cur.spiked) && (
                              <span className="text-slate-200">{cur.spiked ? "🛡️ Spiked helm on" : "Next Lv: 🛡️ Spiked helm"}</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <BuyButton
                      cost={cost}
                      gems={save.gems}
                      label={lvl === 0 ? "Unlock" : "Upgrade"}
                      onClick={() => onBuyTrap(t)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === "boss" && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {BOSS_FORMS.map((f, i) => {
                const owned = i <= save.bossForm;
                const current = i === save.bossForm;
                const isNext = i === save.bossForm + 1;
                return (
                  <div
                    key={f.name}
                    className={`flex flex-col items-center rounded-2xl border-[3px] p-3 text-center ${
                      current
                        ? "border-yellow-300 bg-yellow-300/10 shadow-[0_0_24px_rgba(255,214,80,0.25)]"
                        : "border-[#1b1020] bg-black/35"
                    } ${!owned && !isNext ? "opacity-50" : ""}`}
                  >
                    <div className={!owned && !isNext ? "brightness-[0.25]" : ""}>
                      <BossPortrait form={i} size={120} />
                    </div>
                    <div className="mt-1 text-lg font-black">{f.name}</div>
                    <div className="text-xs tracking-widest text-white/40">{f.title.toUpperCase()}</div>
                    <p className="mt-1 min-h-[2.6rem] text-xs text-white/60">{f.desc}</p>
                    <div className="mt-2 w-full space-y-0.5 text-left text-xs font-bold">
                      <Row k="HP" v={`${f.maxHp}`} />
                      <Row k="Max Mana" v={`${f.maxMana}`} />
                      <Row k="Mana Regen" v={`${f.manaRegen}/s`} />
                      <Row k="Run Speed" v={`${f.speed}`} />
                      <Row k="Roar Power" v={`x${f.roarPower}`} />
                      <Row k="Roar Cooldown" v={`${f.roarCooldown}s`} />
                    </div>
                    <div className="mt-3 w-full">
                      {current ? (
                        <div className="rounded-xl bg-yellow-300/20 py-2 text-sm font-black text-yellow-200">Current Form</div>
                      ) : owned ? (
                        <div className="rounded-xl bg-white/10 py-2 text-sm font-bold text-white/60">Evolved</div>
                      ) : isNext ? (
                        <div className="[&>button]:w-full">
                          <BuyButton cost={f.cost} gems={save.gems} label="Evolve" onClick={onBuyForm} />
                        </div>
                      ) : (
                        <div className="rounded-xl bg-black/40 py-2 text-sm font-bold text-white/40">
                          🔒 💎 {f.cost}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === "dungeon" && (
            <div className="space-y-5">
              <div className="grid gap-3">
                {FACILITIES.map((f) => {
                  const lvl = save.facilities[f.key];
                  const cost = facilityCost(f.key, lvl);
                  return (
                    <div key={f.key} className="flex flex-col gap-3 rounded-2xl border-2 border-[#1b1020] bg-black/35 p-4 sm:flex-row sm:items-center">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-black/40 text-4xl">
                        {f.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xl font-black">{f.name}</span>
                          <Pips level={lvl} max={MAX_FACILITY_LEVEL} />
                        </div>
                        <p className="mt-1 text-sm text-white/65">{f.desc}</p>
                        <p className="mt-1 text-sm font-bold text-emerald-300">
                          Per level: {f.perLevel}
                          {f.key === "mine" && lvl > 0 && (
                            <span className="ml-2 text-white/60">(now {(lvl * MINE_RATE).toFixed(1)}/min)</span>
                          )}
                        </p>
                      </div>
                      <BuyButton
                        cost={cost}
                        gems={save.gems}
                        label={lvl === 0 ? "Build" : "Expand"}
                        onClick={() => onBuyFacility(f.key)}
                      />
                    </div>
                  );
                })}
              </div>
              <div>
                <h3 className="mb-2 text-lg font-black text-yellow-200">🗺️ Dungeon Map</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FLOORS.map((fl, i) => {
                    const cleared = i < save.cleared;
                    const open = i <= save.cleared;
                    return (
                      <div
                        key={fl.id}
                        className={`flex items-center gap-3 rounded-xl border-2 border-[#1b1020] p-3 ${
                          open ? "bg-black/35" : "bg-black/20 opacity-50"
                        }`}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-black text-black"
                          style={{ background: fl.accent }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 text-sm">
                          <div className="font-black">{fl.name}</div>
                          <div className="text-xs text-white/50">
                            {fl.heroName} · HP {fl.heroHp} · 💎 {fl.reward}
                          </div>
                        </div>
                        <div className="text-sm font-bold">{cleared ? "✅ Cleared" : open ? "⚔️ Unlocked" : "🔒"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
