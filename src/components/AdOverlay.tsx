import { useEffect, useRef, useState } from "react";
export interface AdState {
  done: (ok: boolean) => void;
}

/** Development-only rewarded ad simulator. */
export default function AdOverlay({ onDone }: { onDone: (ok: boolean) => void }) {
  const total = 3;
  const [left, setLeft] = useState(total);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const finished = useRef(false);

  useEffect(() => {
    if (left <= 0) {
      if (!finished.current) {
        finished.current = true;
        doneRef.current(true);
      }
      return;
    }
    const id = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/95 text-center">
      <div className="rounded-full border border-white/30 px-3 py-1 text-xs tracking-widest text-white/60">
        DEVELOPMENT · REWARDED AD MOCK
      </div>
      <div className="text-6xl">🎁</div>
      <div className="text-2xl font-black">Simulated rewarded ad</div>
      <div className="text-5xl font-black tabular-nums text-yellow-300">{Math.max(left, 0)}</div>
      <p className="max-w-sm text-sm text-white/50">
        This development mock does not contact an ad provider.
      </p>
      <button
        onClick={() => {
          if (finished.current) return;
          finished.current = true;
          doneRef.current(false);
        }}
        className="mt-2 rounded-lg border border-white/30 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
      >
        Skip (forfeit reward)
      </button>
    </div>
  );
}
