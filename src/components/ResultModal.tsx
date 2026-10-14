import { useEffect, useRef, useState } from "react";
import { FLOORS } from "../game/config";
import { PortalAd } from "../game/portalAd";
import { createBossShareUrl, createBossShareUrlFallback } from "../game/share";
import type { RewardBreakdown, RunMode, RunResult } from "../game/types";

export interface ResultInfo {
  r: RunResult;
  reward: RewardBreakdown;
  floorIndex: number;
  mode: RunMode;
  adClaimed: boolean;
  unlockedNext: boolean;
  adBusy: boolean;
  adUnavailable?: boolean;
  practiceOnly?: boolean;
}

interface Props {
  info: ResultInfo;
  canOfferRewardedAds: boolean;
  canOfferRevive: boolean;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
  onShop: () => void;
  onWatchAd: () => void;
  onRevive: () => void;
  reviveBusy: boolean;
}

function resultNarrative(result: RunResult): string {
  if (result.won) {
    return result.trapHits > 0
      ? "Your traps held. The dungeon is safe—for now."
      : "The hero's quest ends here. Your roar turned the fight.";
  }

  if (result.reason === "boss-defeated") {
    if (result.trapHits === 0) return "He struck you down before your traps landed. Dodge his attacks and place traps in his path.";
    if (result.heroDamagePct >= 0.5) return "You nearly stopped him, but he brought you down first. Dodge and tighten your trap pattern.";
    return "He broke through and defeated you. Dodge his attacks and adjust your traps for the next run.";
  }

  if (result.reason === "exit-reached") {
    if (result.trapHits === 0) return "He reached the gate. Set a trap closer to his path next run.";
    if (result.heroDamagePct >= 0.5) return "You nearly stopped him. A tighter trap layout could hold the gate.";
    return "He reached the gate. Change your trap pattern and try again.";
  }

  if (result.trapHits === 0) return "He found a gap in your defenses. Start with a trap in the green zone.";
  if (result.heroDamagePct >= 0.5) return "You brought him close to defeat. Adjust your trap spacing and try again.";
  return "The hero broke through. A new trap pattern could turn the next run.";
}
const RESULT_ACTION_CLASS = "w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-lg font-black shadow-lg hover:brightness-110";

export default function ResultModal({ info, canOfferRewardedAds, canOfferRevive, onRetry, onNext, onMenu, onShop, onWatchAd, onRevive, reviveBusy }: Props) {
  const [shareUrl, setShareUrl] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [manualShareText, setManualShareText] = useState("");
  const resultEventsSent = useRef(false);
  const { r, reward, floorIndex } = info;
  const floor = FLOORS[floorIndex];
  const hasNext = r.won && floorIndex + 1 < FLOORS.length && !info.practiceOnly;
  const getShareChallenge = () => ({
    floorIndex,
    mode: info.mode,
    won: r.won,
    trapHits: r.trapHits,
    heroDamagePct: r.heroDamagePct,
    trapsPlaced: r.trapsPlaced,
  });

  useEffect(() => {
    if (resultEventsSent.current) return;
    resultEventsSent.current = true;
    PortalAd.measure("button", "challenge-share", "visible");
    PortalAd.measure("button", "retry", "visible");
    if (hasNext) PortalAd.measure("button", "next-floor", "visible");
    if (canOfferRewardedAds && !info.practiceOnly) {
      if (r.won && !info.adClaimed) PortalAd.measure("rewarded", "victory-bonus", "visible");
      if (!r.won && canOfferRevive) PortalAd.measure("rewarded", "defeat-revive", "visible");
    }
  }, [canOfferRewardedAds, canOfferRevive, floorIndex, hasNext, info.adClaimed, info.practiceOnly, r.won]);

  useEffect(() => {
    let active = true;
    setShareUrl("");
    void createBossShareUrl(getShareChallenge()).then((url) => {
      if (active) setShareUrl(url);
    });
    return () => {
      active = false;
    };
  }, [floorIndex, info.mode, r]);

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
        <p className="mt-1 text-white/80">{resultNarrative(r)}</p>
        <p className="mt-1 text-xs text-white/40">
          {floor.sub} · {floor.name}
        </p>
        {info.mode === "no-roar-trial" && (
          <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-orange-300/45 bg-orange-300/10 px-3 py-1 text-xs font-black tracking-wide text-orange-200">
            🗣️ NO ROAR TRIAL · {r.won ? "CLEARED" : "FAILED"}
          </div>
        )}
        {info.practiceOnly && (
          <div className="mx-auto mt-3 inline-flex rounded-full border border-sky-300/45 bg-sky-300/10 px-3 py-1 text-xs font-black tracking-wide text-sky-200">
            PRACTICE CHALLENGE · NO GEMS OR PROGRESS
          </div>
        )}

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
          {reward.challengeBonus > 0 && (
            <div className="flex items-center justify-between text-sm font-bold text-orange-200">
              <span>No Roar Trial bonus</span>
              <span className="tabular-nums">+💎 {reward.challengeBonus}</span>
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
          disabled={info.adBusy}
          onClick={async () => {
            PortalAd.measure("button", "challenge-share", "interact");
            const text = `Can you stop the hero? I placed ${r.trapsPlaced} traps, landed ${r.trapHits} hits, and dealt ${Math.round(r.heroDamagePct * 100)}% damage on Floor ${floorIndex + 1}.`;
            const url = shareUrl || createBossShareUrlFallback(getShareChallenge());
            try {
              if (navigator.share) {
                await navigator.share({ title: "Demon Trap challenge", text, url });
                setShareStatus("Challenge shared! 👹");
                return;
              }
              await navigator.clipboard.writeText(`${text} ${url}`);
              setShareStatus("Challenge link copied! Send it to a friend 👹");
            } catch (error) {
              if (error instanceof DOMException && error.name === "AbortError") return;
              try {
                await navigator.clipboard.writeText(`${text} ${url}`);
                setShareStatus("Challenge link copied! Send it to a friend 👹");
              } catch {
                setManualShareText(`${text} ${url}`);
                setShareStatus("Select the challenge message below and copy it.");
              }
            }
          }}
          className="mt-3 w-full rounded-xl border-2 border-orange-200/40 bg-orange-300/10 py-2 text-sm font-bold text-orange-100 hover:bg-orange-300/20 disabled:opacity-50"
        >
          👹 Challenge a friend to stop this hero
        </button>
        {shareStatus && <p aria-live="polite" className="mt-1 text-xs text-emerald-200">{shareStatus}</p>}
        {manualShareText && (
          <textarea
            aria-label="Challenge message to copy"
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            value={manualShareText}
            rows={3}
            className="mt-2 w-full resize-none rounded-lg border border-white/20 bg-black/40 p-2 text-xs text-white/80"
          />
        )}

        <button
          disabled={info.adBusy}
          onClick={() => {
            if (hasNext) {
              PortalAd.measure("button", "next-floor", "interact");
              onNext();
            } else {
              PortalAd.measure("button", "retry", "interact");
              onRetry();
            }
          }}
          className={`${RESULT_ACTION_CLASS} mt-4 disabled:opacity-50`}
        >
          {hasNext ? "⏭ Next floor" : "🔁 Retry"}
        </button>

        {info.adUnavailable && (
          <p role="status" aria-live="polite" className="mt-2 text-sm font-bold text-orange-100/80">
            No ad is available right now. Continue without it and try again later.
          </p>
        )}
        {info.adClaimed && r.won && (
          <p role="status" aria-live="polite" className="mt-2 text-sm font-bold text-emerald-200">
            ✅ Ad bonus claimed · 2× gems
          </p>
        )}
        {canOfferRewardedAds && !info.practiceOnly && (
          <div className="mt-2 space-y-2">
            {r.won && !info.adClaimed && (
              <button
                disabled={info.adBusy}
                onClick={() => {
                  PortalAd.measure("rewarded", "victory-bonus", "interact");
                  onWatchAd();
                }}
                className={`${RESULT_ACTION_CLASS} disabled:opacity-50`}
              >
                🎬 Watch an ad for +{reward.total} gems
              </button>
            )}
            {!r.won && canOfferRevive && (
              <button
                disabled={info.adBusy || reviveBusy}
                onClick={() => {
                  PortalAd.measure("rewarded", "defeat-revive", "interact");
                  onRevive();
                }}
                className={`${RESULT_ACTION_CLASS} disabled:opacity-50`}
              >
                {info.adBusy || reviveBusy ? "🎬 Loading ad…" : "🎬 Watch an ad to revive · 50% HP"}
              </button>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3">
          {hasNext && (
            <button
              disabled={info.adBusy}
              onClick={() => {
                PortalAd.measure("button", "retry", "interact");
                onRetry();
              }}
              className="rounded-2xl border-4 border-[#1b1020] bg-black/50 py-2 font-bold hover:bg-black/70 disabled:opacity-50"
            >
              🔁 Retry
            </button>
          )}
          <button
            disabled={info.adBusy}
            onClick={onShop}
            className="rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-sky-500 to-indigo-700 py-3 text-lg font-black hover:brightness-110 disabled:opacity-50"
          >
            🛒 Upgrade
          </button>
          <button
            disabled={info.adBusy}
            onClick={onMenu}
            className={`rounded-2xl border-4 border-[#1b1020] bg-black/50 py-2 font-bold hover:bg-black/70 disabled:opacity-50 ${hasNext ? "col-span-2" : ""}`}
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
