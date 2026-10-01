import { useEffect, useState } from "react";
import { bgUrl } from "../game/assets";
import { BOSS_FORMS, FLOORS } from "../game/config";
import { DAILY_REWARDS, dailyStatus, pendingMine } from "../game/progression";
import type { SaveData } from "../game/types";
import BossPortrait from "./BossPortrait";
import type { ShopTab } from "./Shop";

interface Props {
  save: SaveData;
  onStart: (floor: number) => void;
  onSelectFloor: (i: number) => void;
  onShop: (tab?: ShopTab) => void;
  onHelp: () => void;
  onCollect: () => void;
  onClaimDaily: () => void;
  onToggleSound: () => void;
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
  onToggleFx,
  onReset,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [showReset, setShowReset] = useState(false);
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
        {/* 상단 바 */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full border-2 border-violet-400/60 bg-black/60 px-5 py-1.5 text-xl font-black tabular-nums text-violet-200 shadow-lg">
            💎 {save.gems.toLocaleString()}
            <span className="text-xs font-bold text-white/40">다크젬</span>
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
                ⛏️ 광산 수익 {pending > 0 ? `+${pending} 수령` : "적립 중"}
              </button>
            )}
            <button
              onClick={onClaimDaily}
              disabled={!daily.available}
              title={DAILY_REWARDS.map((v, i) => `${i + 1}일차: ${v}젬`).join(" · ")}
              className={`rounded-full border-2 border-[#1b1020] px-4 py-1.5 text-sm font-black transition ${
                daily.available
                  ? "animate-pulse bg-gradient-to-b from-amber-300 to-orange-600 text-black hover:brightness-110"
                  : "bg-black/50 text-white/40"
              }`}
            >
              🎁 {daily.available ? `+${daily.amount} 수령 (${daily.streakDay}일째)` : `출석 ${daily.streakDay}일째`}
            </button>
            <button onClick={onHelp} className="rounded-full border-2 border-[#1b1020] bg-black/60 px-4 py-1.5 text-sm font-bold hover:bg-black/80">
              ❓ 방법
            </button>
            <button onClick={onToggleSound} className="rounded-full border-2 border-[#1b1020] bg-black/60 px-3 py-1.5 text-sm hover:bg-black/80">
              {save.soundOn ? "🔊" : "🔇"}
            </button>
            <button
              onClick={onToggleFx}
              title={save.lowFx ? "이펙트 절약 모드 켜짐" : "이펙트 절약 모드 끔"}
              className={`rounded-full border-2 border-[#1b1020] px-3 py-1.5 text-sm hover:bg-black/80 ${
                save.lowFx ? "bg-emerald-700" : "bg-black/60"
              }`}
            >
              {save.lowFx ? "✨ 절약" : "✨ 풍부"}
            </button>
          </div>
        </div>

        {/* 타이틀 */}
        <header className="mt-4 text-center sm:mt-6">
          <div className="text-xs font-bold tracking-[0.5em] text-orange-300/80">역발상 쿠파 모드</div>
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
            용사가 공주를 구하러 온다고? 이번엔 <b className="text-rose-300">네가 마왕</b>이다.
            <br />
            쫓아오는 용사 앞에 <b className="text-orange-300">용암·가시·졸개</b>를 즉석 설치해 물리쳐라!
          </p>
        </header>

        {/* 메인 그리드 */}
        <main className="mt-5 grid flex-1 gap-4 lg:grid-cols-[320px_1fr]">
          {/* 보스 카드 */}
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
                  ⬆ 진화 가능!
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-black">{form.name}</div>
              <div className="text-xs tracking-[0.3em] text-white/40">{form.title.toUpperCase()}</div>
            </div>
            <div className="mt-3 space-y-1.5">
              <StatBar label="체력" pct={form.maxHp / maxOf("maxHp")} color="#f87171" value={`${form.maxHp}`} />
              <StatBar
                label="마나"
                pct={(form.maxMana + 12 * save.facilities.well) / (maxOf("maxMana") + 60)}
                color="#a78bfa"
                value={`${form.maxMana + 12 * save.facilities.well}`}
              />
              <StatBar
                label="재생"
                pct={(form.manaRegen + 1.2 * save.facilities.well) / (maxOf("manaRegen") + 6)}
                color="#60a5fa"
                value={`${(form.manaRegen + 1.2 * save.facilities.well).toFixed(1)}/s`}
              />
              <StatBar label="포효" pct={form.roarPower / maxOf("roarPower")} color="#fb923c" value={`x${form.roarPower}`} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => onShop("trap")}
                className={`rounded-xl border-[3px] border-[#1b1020] bg-gradient-to-b from-sky-500 to-indigo-700 py-2 text-sm font-black hover:brightness-110 ${
                  canUpgradeSomething ? "ring-2 ring-yellow-300/70" : ""
                }`}
              >
                🛒 마왕성 강화
              </button>
              <button
                onClick={() => onShop("dungeon")}
                className="rounded-xl border-[3px] border-[#1b1020] bg-gradient-to-b from-emerald-500 to-teal-700 py-2 text-sm font-black hover:brightness-110"
              >
                🏰 던전 확장
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">출격</div>
                <div className="text-base font-black tabular-nums">{save.stats.runs}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">용사 퇴치</div>
                <div className="text-base font-black tabular-nums">{save.stats.heroesDefeated}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1.5">
                <div className="text-white/40">누적 💎</div>
                <div className="text-base font-black tabular-nums">{save.totalEarned}</div>
              </div>
            </div>
          </section>

          {/* 던전 층 선택 */}
          <section className="flex flex-col rounded-3xl border-4 border-[#1b1020] bg-black/55 p-4 shadow-2xl backdrop-blur-sm">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-yellow-200">
              🗺️ 던전 — 용사를 맞이할 층을 고르세요
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
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#1b1020] text-xl font-black text-black"
                      style={{ background: open ? f.accent : "#555" }}
                    >
                      {open ? i + 1 : "🔒"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-lg font-black">{f.name}</span>
                        <span className="text-xs text-white/40">{f.sub}</span>
                      </div>
                      <div className="truncate text-xs text-white/60">{f.desc}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs font-bold">
                        <span className="text-emerald-300">🧑‍🔧 {f.heroName}</span>
                        <span className="text-rose-300">HP {f.heroHp}</span>
                        <span className="text-sky-300">거리 {(f.length / 100).toFixed(0)}m</span>
                        <span className="text-violet-300">💎 {f.reward}+</span>
                      </div>
                    </div>
                    <div className="text-right text-xs font-bold">
                      {cleared ? <span className="text-emerald-300">✅ 정복</span> : open ? <span className="text-orange-300">도전 가능</span> : <span className="text-white/40">이전 층 클리어 필요</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => onStart(selected)}
              className="start-btn mt-4 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 via-red-500 to-red-700 py-4 text-2xl font-black tracking-wide shadow-[0_6px_0_#5a0f14] transition hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_#5a0f14]"
            >
              ⚔️ 출격! — {floor.sub}
            </button>
          </section>
        </main>

        <footer className="mt-4 flex items-center justify-between text-xs text-white/40">
          <span>마우스 클릭/드래그 · 1·2·3 트랩 선택 · Space 포효</span>
          <button onClick={() => setShowReset(true)} className="underline decoration-dotted hover:text-white/70">
            데이터 초기화
          </button>
        </footer>
      </div>

      {/* 데이터 초기화 확인 모달 (포털 iframe에서는 window.confirm이 차단되므로 인게임 UI 사용) */}
      {showReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowReset(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border-2 border-[#1b1020] bg-gradient-to-b from-[#2a1030] to-[#12060f] p-6 text-center shadow-2xl">
            <div className="text-4xl">⚠️</div>
            <h2 className="mt-2 text-xl font-black text-white">정말 초기화할까요?</h2>
            <p className="mt-1 text-sm text-white/60">
              저장된 진행 상황(젬·트랩·던전·기록)이 모두 사라집니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowReset(false)}
                className="rounded-xl border-2 border-[#1b1020] bg-white/10 py-2.5 font-black text-white hover:bg-white/20"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowReset(false);
                  onReset();
                }}
                className="rounded-xl border-2 border-[#1b1020] bg-gradient-to-b from-red-500 to-red-700 py-2.5 font-black text-white hover:brightness-110"
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
