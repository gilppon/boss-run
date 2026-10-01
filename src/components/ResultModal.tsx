import { FLOORS } from "../game/config";
import type { RewardBreakdown, RunResult } from "../game/types";

export interface ResultInfo {
  r: RunResult;
  reward: RewardBreakdown;
  floorIndex: number;
  adClaimed: boolean;
  unlockedNext: boolean;
  adBusy: boolean;
}

interface Props {
  info: ResultInfo;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
  onShop: () => void;
  onWatchAd: () => void;
  onRevive: () => void;
  reviveBusy: boolean;
}

const REASON: Record<string, string> = {
  "hero-defeated": "He went down in your trap and stayed there.",
  "boss-defeated": "The hero's blade put the demon down…",
  "exit-reached": "You reached the gate. He's still breathing…",
};

export default function ResultModal({ info, onRetry, onNext, onMenu, onShop, onWatchAd, onRevive, reviveBusy }: Props) {
  const { r, reward, floorIndex } = info;
  const floor = FLOORS[floorIndex];
  const hasNext = r.won && floorIndex + 1 < FLOORS.length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div
        className={`pop-in w-full max-w-lg rounded-3xl border-4 border-[#1b1020] p-6 text-center shadow-2xl ${
          r.won ? "bg-gradient-to-b from-[#5a2a10] to-[#2a1020]" : "bg-gradient-to-b from-[#2a1a3a] to-[#150a1c]"
        }`}
      >
        <div className="text-6xl">{r.won ? "👑" : "💀"}</div>
        <h2 className={`mt-1 text-4xl font-black ${r.won ? "text-yellow-300" : "text-rose-300"}`}>
          {r.won ? "HERO DEFEATED!" : "DEFEAT!"}
        </h2>
        <p className="mt-1 text-white/80">{REASON[r.reason]}</p>
        <p className="mt-1 text-xs text-white/40">
          {floor.sub} · {floor.name}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <Stat label="Survived" value={`${r.time.toFixed(1)}s`} />
          <Stat label="Traps Placed" value={`${r.trapsPlaced}`} />
          <Stat label="Trap Hits" value={`${r.trapHits}`} />
          <Stat label="Hero Damage" value={`${Math.round(r.heroDamagePct * 100)}%`} />
          <Stat label="Boss HP" value={`${Math.round(r.bossHpPct * 100)}%`} />
          <Stat label="Minions Killed" value={`${r.minionKills}`} />
        </div>

        <div className="mt-4 rounded-2xl bg-black/40 p-4">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>Base reward</span>
            <span className="tabular-nums">💎 {reward.base}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>{r.won ? "HP remaining bonus" : "Progress bonus"}</span>
            <span className="tabular-nums">💎 {reward.bonus}</span>
          </div>
          {reward.vaultPct > 0 && (
            <div className="flex items-center justify-between text-sm text-emerald-300">
              <span>Vault bonus</span>
              <span className="tabular-nums">+{reward.vaultPct}%</span>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-2xl font-black text-violet-300">
            <span>Gems</span>
            <span className="tabular-nums">💎 +{reward.total + (info.adClaimed ? reward.total : 0)}</span>
          </div>
        </div>

        {info.unlockedNext && (
          <div className="mt-3 rounded-xl border border-yellow-300/40 bg-yellow-300/10 px-3 py-2 text-sm font-bold text-yellow-200">
            🔓 New floor unlocked: {FLOORS[floorIndex + 1].name}
          </div>
        )}

        <button
          disabled={info.adClaimed || info.adBusy}
          onClick={onWatchAd}
          className="mt-4 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-fuchsia-500 to-violet-700 py-3 text-lg font-black shadow-lg transition hover:brightness-110 disabled:opacity-40"
        >
          {info.adClaimed ? "✅ Ad bonus claimed (2×)" : `🎬 Watch an ad for +${reward.total} gems`}
        </button>

        {!r.won && (
          <button
            disabled={info.adBusy || reviveBusy}
            onClick={onRevive}
            className="mt-3 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-emerald-500 to-teal-700 py-3 text-lg font-black shadow-lg transition hover:brightness-110 disabled:opacity-40"
          >
            {info.adBusy || reviveBusy ? "🎬 Loading ad…" : "🎬 Watch an ad to revive! (Hero back at 50% HP)"}
          </button>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {hasNext ? (
            <button
              onClick={onNext}
              className="rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-lg font-black hover:brightness-110"
            >
              ⏭ Next floor
            </button>
          ) : (
            <button
              onClick={onRetry}
              className="rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-lg font-black hover:brightness-110"
            >
              🔁 Retry
            </button>
          )}
          <button
            onClick={onShop}
            className="rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-sky-500 to-indigo-700 py-3 text-lg font-black hover:brightness-110"
          >
            🛒 Upgrade
          </button>
          {hasNext && (
            <button
              onClick={onRetry}
              className="rounded-2xl border-4 border-[#1b1020] bg-black/50 py-2 font-bold hover:bg-black/70"
            >
              🔁 Retry
            </button>
          )}
          <button
            onClick={onMenu}
            className={`rounded-2xl border-4 border-[#1b1020] bg-black/50 py-2 font-bold hover:bg-black/70 ${hasNext ? "" : "col-span-2"}`}
          >
            🏰 Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 px-2 py-2">
      <div className="text-xs text-white/50">{label}</div>
      <div className="text-lg font-black tabular-nums">{value}</div>
    </div>
  );
}
