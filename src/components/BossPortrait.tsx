import { useId } from "react";
import { BOSS_FORMS } from "../game/config";

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");

export default function BossPortrait({
  form,
  size = 160,
  className,
}: {
  form: number;
  size?: number;
  className?: string;
}) {
  const id = useId();
  const d = BOSS_FORMS[Math.min(form, BOSS_FORMS.length - 1)];
  const p = d.palette;
  const body = hex(p.body);
  const belly = hex(p.belly);
  const horn = hex(p.horn);
  const eye = hex(p.eye);
  const accent = hex(p.accent);
  const line = "#1b1020";

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-label={d.name}>
      <defs>
        <radialGradient id={`${id}-aura`}>
          <stop offset="0%" stopColor="#ff8a1f" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ff3d0e" stopOpacity="0" />
        </radialGradient>
      </defs>
      {d.aura && <circle cx="100" cy="105" r="98" fill={`url(#${id}-aura)`} />}
      {d.wings && (
        <g fill={accent} stroke={line} strokeWidth="4" strokeLinejoin="round">
          <path d="M62 120 L6 56 L26 104 L0 100 L30 138 L8 152 L66 158Z" />
          <path d="M138 120 L194 56 L174 104 L200 100 L170 138 L192 152 L134 158Z" />
        </g>
      )}
      <ellipse cx="100" cy="180" rx="64" ry="44" fill={body} stroke={line} strokeWidth="5" />
      <ellipse cx="100" cy="188" rx="34" ry="32" fill={belly} stroke={line} strokeWidth="3" opacity="0.95" />
      <g fill={horn} stroke={line} strokeWidth="5" strokeLinejoin="round">
        <path d="M56 66 L38 12 L88 48Z" />
        <path d="M144 66 L162 12 L112 48Z" />
      </g>
      <ellipse cx="100" cy="100" rx="60" ry="53" fill={body} stroke={line} strokeWidth="5" />
      <g stroke={line} strokeWidth="4">
        <ellipse cx="74" cy="96" rx="15" ry="17" fill={eye} />
        <ellipse cx="126" cy="96" rx="15" ry="17" fill={eye} />
      </g>
      <ellipse cx="77" cy="96" rx="4.5" ry="12" fill="#110008" />
      <ellipse cx="129" cy="96" rx="4.5" ry="12" fill="#110008" />
      <g stroke={line} strokeWidth="8" strokeLinecap="round">
        <path d="M52 70 L90 86" />
        <path d="M148 70 L110 86" />
      </g>
      <circle cx="94" cy="112" r="2.6" fill={accent} />
      <circle cx="106" cy="112" r="2.6" fill={accent} />
      <path d="M62 124 Q100 162 138 124 Q100 138 62 124Z" fill="#1a0410" stroke={line} strokeWidth="4" strokeLinejoin="round" />
      <g fill="#fff" stroke={line} strokeWidth="2">
        <path d="M74 130 L84 133 L79 145Z" />
        <path d="M126 130 L116 133 L121 145Z" />
      </g>
      {d.crown && (
        <g>
          <path d="M60 52 L52 18 L80 38 L100 6 L120 38 L148 18 L140 52Z" fill="#ffd23f" stroke={line} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="100" cy="34" r="6" fill="#ff2d55" stroke={line} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}
