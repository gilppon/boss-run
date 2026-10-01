import { useEffect, useRef, useState } from "react";
import type { AdKind } from "../game/poki";

export interface AdState {
  kind: AdKind;
  done: (ok: boolean) => void;
}

/** Mock ad screen for testing the ad flow where the Poki SDK is not available */
export default function AdOverlay({ kind, onDone }: { kind: AdKind; onDone: (ok: boolean) => void }) {
  const total = kind === "rewarded" ? 3 : 2;
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
        AD · POKI SDK MOCK
      </div>
      <div className="text-6xl">{kind === "rewarded" ? "🎁" : "📺"}</div>
      <div className="text-2xl font-black">
        {kind === "rewarded" ? "Rewarded ad playing..." : "An ad is coming up"}
      </div>
      <div className="text-5xl font-black tabular-nums text-yellow-300">{Math.max(left, 0)}</div>
      <p className="max-w-sm text-sm text-white/50">
        In a real Poki environment (or with the ?poki param) a real Poki ad shows here.
      </p>
      {kind === "rewarded" && (
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
      )}
    </div>
  );
}
