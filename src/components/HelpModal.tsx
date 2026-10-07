import { BOSS_FORMS, TRAP_DEFS } from "../game/config";

export default function HelpModal({ onClose }: { onClose: () => void }) {
  const starterMana = BOSS_FORMS[0]?.maxMana ?? 100;
  const lavaCost = TRAP_DEFS.Lava.baseCost;
  const tilesBeforeRefill = Math.floor(starterMana / lavaCost);
  const manaForNextTile = lavaCost - (starterMana % lavaCost);
  const rows: Array<[string, string, string]> = [
    [
      "🌋",
      "Lava Pit",
      `Wider pits force longer jumps. Each tile costs ${lavaCost} mana; the starting ${starterMana} lets you place ${tilesBeforeRefill} quickly, then wait for ${manaForNextTile} mana before adding the next.`,
    ],
    ["🗡️", "Drop Spikes", "Falls from the ceiling as the hero approaches. Spot it and stop — that stall is free damage."],
    ["👺", "Flame Minion", "Spits fire. Step on it and it dies, but from Lv.3 its spiked helm bites anyone who stomps on it too."],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border-4 border-[#1b1020] bg-gradient-to-b from-[#2c1230] to-[#160a1c] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl font-black text-yellow-300">📖 Demon Survival Guide</h2>
          <button onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1 text-lg hover:bg-white/20">
            ✕
          </button>
        </div>
        <ul className="space-y-3 text-white/90">
          <li>
            <b className="text-rose-300">GOAL</b> · The demon runs forward on his own. The <b>hero</b> is chasing you from
            behind — knock him down with <b>traps before he touches you</b>, and before you reach the gate.
          </li>
          <li>
            <b className="text-emerald-300">PLACE</b> · <b>Click</b> or <b>drag</b> on the <b>green zone</b> (the floor
            between the hero and the demon) and the trap appears on the spot. It costs mana (💜), which refills over
            time.
          </li>
          <li>
            <b className="text-cyan-300">COMBO</b> · Hit him again within <b>3.5 seconds</b>. Chain 2/4/6/8 hits to
            reclaim <b>6/8/10/12 mana</b> and keep the traps coming.
          </li>
          <li>
            <b className="text-sky-300">TACTICAL MIX</b> · Use different trap types in one combo for <b>+5 mana</b>
            per new type, up to <b>+10</b>.
          </li>
          <li>
            <b className="text-amber-300">B1 RUNES</b> · Gold floor marks boost a trap's damage by <b>35%</b>.
            Lava on a rune erupts high enough to catch low jumps.
          </li>
          <li>
            <b className="text-teal-300">B2 TIDAL SURGE</b> · Every <b>10 seconds</b>, the sewer warns you before a
            current pushes the hero to <b>24% faster</b> for <b>1.35 seconds</b>. Place traps or time your roar.
          </li>
          <li>
            <b className="text-orange-300">B3 FORGE DROP</b> · A marked steel beam falls every <b>11 seconds</b>.
            Aim a trap at the landing mark; a grounded hero caught there is staggered.
          </li>
          <li>
            <b className="text-violet-300">B4 ABYSS ECHO</b> · A phantom hazard baits the hero into jumping.
            Place a trap on the teal landing mark to catch him.
          </li>
          <li>
            <b className="text-amber-200">B5 CATHEDRAL BELL</b> · A bell rings every <b>8.96 seconds</b>.
            A real trap hit during the brief choir resonance extends the combo link by <b>2.2 seconds</b>.
          </li>
          <li>
            <b className="text-orange-300">ROAR</b> · <kbd className="rounded bg-white/20 px-2">Space</kbd> or
            right-click. Shoves the hero far back and slows him for a moment. Your emergency button when he's right on
            top of you!
          </li>
          <li>
            <b className="text-amber-200">NO ROAR TRIAL</b> · Disables that emergency ability for the whole run and
            adds <b>25% to the reward</b>. Retry and revive keep the contract active.
          </li>
          <li>
            <b className="text-sky-300">KEYS</b> · <kbd className="rounded bg-white/20 px-2">1</kbd>{" "}
            <kbd className="rounded bg-white/20 px-2">2</kbd> <kbd className="rounded bg-white/20 px-2">3</kbd> pick a
            trap · <kbd className="rounded bg-white/20 px-2">Esc</kbd> pause
          </li>
          <li>
            <b className="text-violet-300">HERO AI</b> · He reads the traps ahead and times his jumps. He also dodges
            whatever waits at the landing spot, so <b>lay traps in combos to aim him at one</b>.
          </li>
        </ul>
        <div className="mt-5 space-y-2">
          {rows.map(([icon, name, desc]) => (
            <div key={name} className="flex items-start gap-3 rounded-xl bg-black/30 p-3">
              <div className="text-3xl">{icon}</div>
              <div>
                <div className="font-black">{name}</div>
                <div className="text-sm text-white/70">{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-white/60">
          💎 Every run earns you <b>gems</b>. Upgrade traps, evolve the boss, expand the dungeon, then take on a
          tougher hero!
        </p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border-4 border-[#1b1020] bg-gradient-to-b from-orange-400 to-red-600 py-3 text-xl font-black hover:brightness-110"
        >
          Got it! Time to be a demon.
        </button>
      </div>
    </div>
  );
}
