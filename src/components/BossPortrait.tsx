import { BOSS_FORMS } from "../game/config";

const BOSS_SPRITES: Record<number, string> = {
  0: "./sprites/boss_demon.webp",
  1: "./sprites/boss_hell_king.webp",
  2: "./sprites/boss_abyss_lord.webp",
  3: "./sprites/boss_last_emperor.webp",
};

export default function BossPortrait({
  form,
  size = 160,
  className,
}: {
  form: number;
  size?: number;
  className?: string;
}) {
  const safeForm = Math.min(Math.max(0, form), BOSS_FORMS.length - 1);
  const d = BOSS_FORMS[safeForm];
  const spriteSrc = BOSS_SPRITES[safeForm] ?? BOSS_SPRITES[0];

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-3xl border-4 border-[#1b1020] shadow-2xl ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle, rgba(192,49,63,0.35) 0%, rgba(20,5,15,0.95) 75%)",
      }}
      role="img"
      aria-label={d.name}
    >
      {/* 엠비언트 헬파이어 오라 */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-950/60 via-transparent to-amber-500/10 pointer-events-none" />
      <img
        src={spriteSrc}
        alt={d.name}
        className="w-full h-full object-contain p-2 transform scale-105 filter drop-shadow(0 6px 12px rgba(0,0,0,0.8)) transition-transform duration-300 hover:scale-110"
        onError={(e) => {
          (e.currentTarget as HTMLElement).style.display = "none";
        }}
      />
    </div>
  );
}
