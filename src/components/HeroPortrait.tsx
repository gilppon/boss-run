import { useId, type CSSProperties } from "react";
import { HERO_CHARACTERS } from "../game/config";
import type { HeroCharacterId } from "../game/types";

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

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
  const gradientId = useId();
  const hero = HERO_CHARACTERS[id];
  const p = hero.palette;
  const line = "#1b1020";
  const skin = hex(p.skin);
  const hair = hex(p.hair);
  const cloth = hex(p.cloth);
  const armor = hex(p.armor);
  const metal = hex(p.metal);
  const accent = hex(p.accent);
  const eye = hex(p.eye);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label={`${hero.name} — ${hero.title}`}
    >
      <defs>
        <linearGradient id={`hero-${gradientId}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
          <stop offset="100%" stopColor={armor} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#hero-${gradientId}-bg)`} stroke={line} strokeWidth="3" />
      <path d="M8 58 Q11 40 32 40 Q53 40 56 58Z" fill={cloth} stroke={line} strokeWidth="3" />
      <path d="M23 43 L32 53 L41 43" fill={accent} stroke={line} strokeWidth="2" />
      <ellipse cx="32" cy="29" rx="17" ry="19" fill={skin} stroke={line} strokeWidth="3" />

      {hero.silhouette === "apprentice" && (
        <>
          <path d="M17 25 Q17 10 30 13 L39 15 L46 23 L42 25 L35 21 L28 24 L20 22Z" fill={hair} stroke={line} strokeWidth="2.5" />
          <path d="M17 24 Q31 20 46 24" fill="none" stroke={accent} strokeWidth="4" />
        </>
      )}
      {hero.silhouette === "scout" && (
        <>
          <path d="M13 31 Q10 13 29 9 Q48 11 51 29 L44 24 L40 18 L32 22 L22 19 L19 30Z" fill={cloth} stroke={line} strokeWidth="3" />
          <path d="M16 27 Q31 22 47 27" fill="none" stroke={metal} strokeWidth="2.5" />
        </>
      )}
      {hero.silhouette === "warden" && (
        <>
          <path d="M15 26 L17 15 Q31 8 47 15 L49 27Z" fill={metal} stroke={line} strokeWidth="3" />
          <path d="M27 14 L34 5 L38 15Z" fill={accent} stroke={line} strokeWidth="2" />
          <path d="M15 25 H49" stroke={armor} strokeWidth="4" />
        </>
      )}
      {hero.silhouette === "breaker" && (
        <>
          <path d="M13 31 L16 14 L31 7 L48 15 L51 32 L43 26 L39 19 L31 22 L22 19 L19 30Z" fill={cloth} stroke={line} strokeWidth="3" />
          <path d="M15 22 L8 13 L22 18 M48 22 L56 13 L42 18" fill={accent} stroke={line} strokeWidth="2.5" />
        </>
      )}
      {hero.silhouette === "duelist" && (
        <>
          <path d="M15 25 Q31 15 49 25" fill="none" stroke={hair} strokeWidth="6" />
          <path d="M17 20 L16 12 L25 17 L32 7 L39 17 L48 12 L47 21Z" fill={metal} stroke={line} strokeWidth="2.5" />
          <circle cx="32" cy="15" r="2.5" fill={accent} stroke={line} strokeWidth="1" />
        </>
      )}

      <ellipse cx="26" cy="31" rx="2.2" ry="3" fill={eye} />
      <ellipse cx="39" cy="31" rx="2.2" ry="3" fill={eye} />
      <path d="M28 38 Q33 41 38 37" fill="none" stroke={line} strokeWidth="2" strokeLinecap="round" />
      {hero.silhouette === "scout" && <path d="M19 30 H43" stroke={metal} strokeWidth="2.5" />}
      {hero.silhouette === "duelist" && <path d="M49 47 L57 37" stroke={metal} strokeWidth="3" strokeLinecap="round" />}
      {hero.silhouette === "apprentice" && <path d="M10 49 L17 39" stroke={metal} strokeWidth="3" strokeLinecap="round" />}
    </svg>
  );
}
