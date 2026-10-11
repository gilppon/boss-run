import type { CSSProperties } from "react";
import { HERO_CHARACTERS } from "../game/config";
import type { HeroCharacterId } from "../game/types";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

const SPRITE_MAP: Record<string, string> = {
  apprentice: "./sprites/hero_apprentice.webp",
  scout: "./sprites/hero_scout.webp",
  warden: "./sprites/hero_warden.webp",
  breaker: "./sprites/hero_breaker.webp",
  duelist: "./sprites/hero_duelist.webp",
};

export default function HeroPortrait({
  id,
  size = 48,
  className,
  style,
}: {
  id: HeroCharacterId;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const hero = HERO_CHARACTERS[id];
  const p = hero.palette;
  const accent = hex(p.accent);
  const armor = hex(p.armor);
  const spriteSrc = SPRITE_MAP[hero.silhouette];

  return (
    <div
      className={`relative inline-block overflow-hidden rounded-2xl border-2 border-[#1b1020] shadow-md ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${accent}cc 0%, ${armor}ee 100%)`,
        ...style,
      }}
      role="img"
      aria-label={`${hero.name} — ${hero.title}`}
    >
      {spriteSrc && (
        <img
          src={spriteSrc}
          alt={hero.name}
          className="w-full h-full object-contain p-1 transform scale-110 -translate-y-0.5 filter drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}
