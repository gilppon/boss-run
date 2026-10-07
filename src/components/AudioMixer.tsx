interface Props {
  musicVolume: number;
  sfxVolume: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onSetAudioVolume: (channel: "musicVolume" | "sfxVolume", value: number) => void;
  compact?: boolean;
}

export default function AudioMixer({
  musicVolume,
  sfxVolume,
  soundOn,
  onToggleSound,
  onSetAudioVolume,
  compact = false,
}: Props) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-xs font-black tracking-[0.22em] text-orange-200/70">DUNGEON MIX</div>
          <div className="mt-0.5 text-sm font-black text-white">Audio balance</div>
        </div>
        <button
          onClick={onToggleSound}
          aria-label={soundOn ? "Mute all audio" : "Enable all audio"}
          className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-sm transition hover:bg-white/10"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>
      <div className={compact ? "space-y-2" : "space-y-3"}>
        {([
          ["musicVolume", "🎼 Music", musicVolume],
          ["sfxVolume", "⚔ Effects", sfxVolume],
        ] as const).map(([channel, label, value]) => (
          <label key={channel} className="block">
            <span className="mb-1 flex items-center justify-between text-xs font-bold text-white/75">
              <span>{label}</span>
              <span className="tabular-nums text-orange-100">{Math.round(value * 100)}%</span>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={value}
              aria-label={label}
              onChange={(event) => onSetAudioVolume(channel, Number(event.currentTarget.value))}
              className="h-2 w-full cursor-pointer accent-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-200"
            />
          </label>
        ))}
      </div>
      <div className="mt-3 border-t border-white/10 pt-2 text-[10px] font-semibold tracking-wide text-white/45">
        Saved automatically · changes fade smoothly
      </div>
    </>
  );
}
