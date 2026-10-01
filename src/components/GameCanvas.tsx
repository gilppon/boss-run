import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import { loadBackdrop } from "../game/assets";
import { BossScene } from "../game/BossScene";
import { bus } from "../game/bus";
import { H, W } from "../game/constants";
import type { RunConfig, RunResult } from "../game/types";

interface Props {
  config: RunConfig;
  onEnd: (r: RunResult) => void;
  className?: string;
}

/** Phaser 게임 인스턴스를 React 수명주기에 묶는다 (런마다 새로 생성/파괴) */
export default function GameCanvas({ config, onEnd, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;
    const off = bus.on("end", (r: RunResult) => endRef.current(r));

    loadBackdrop().then((img) => {
      if (cancelled || !ref.current) return;
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: ref.current,
        width: W,
        height: H,
        backgroundColor: "#12060d",
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        audio: { noAudio: true },
        render: { antialias: true, powerPreference: "high-performance" },
        banner: false,
      });
      game.scene.add("BossScene", BossScene, true, { config, backdrop: img });
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      off();
      setReady(false);
      if (game) {
        game.destroy(true);
        game = null;
      }
    };
  }, [config]);

  return (
    <div ref={ref} className={className} style={{ touchAction: "none" }}>
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#12060d]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-orange-400" />
          <div className="text-sm font-bold text-white/60">던전 소환 중...</div>
        </div>
      )}
    </div>
  );
}
