import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const loadCommonJs = async (filePath, requireModule = () => { throw new Error("Unexpected module dependency"); }) => {
  const source = await readFile(filePath, "utf8");
  const { outputText, diagnostics } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  assert.equal(diagnostics?.length ?? 0, 0, `${filePath} should transpile without diagnostics`);
  const module = { exports: {} };
  new Function("exports", "require", "module", outputText)(module.exports, requireModule, module);
  return module.exports;
};

class DisplayObject {
  setDepth() { return this; }
  setAlpha() { return this; }
  setPosition() { return this; }
  setScale() { return this; }
  destroy() {}
}

class MockHeroView {
  constructor() { this.container = new DisplayObject(); }
  update() {}
  flash() {}
  brace() {}
  land() {}
  launch() {}
}

const constants = await loadCommonJs(new URL("../src/game/constants.ts", import.meta.url));
const behavior = await loadCommonJs(new URL("../src/game/characterBehavior.ts", import.meta.url));
const { FLOORS, HERO_CHARACTERS } = await loadCommonJs(new URL("../src/game/config.ts", import.meta.url));
const phaserMock = { Math: { Clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } };
const heroModule = await loadCommonJs(
  new URL("../src/game/HeroAIController.ts", import.meta.url),
  (id) => {
    if (id === "phaser") return { default: phaserMock };
    if (id === "./constants") return constants;
    if (id === "./characters") return { HeroView: MockHeroView };
    if (id === "./characterBehavior") return behavior;
    throw new Error(`Unexpected HeroAIController dependency: ${id}`);
  }
);
const { HeroAIController } = heroModule;

const makeRandom = (seedValue) => {
  let seed = seedValue >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
};

function makeScenario(floor, seed) {
  const random = makeRandom(seed ^ 0xa511e9b3);
  const { CELL, BOSS_SCREEN_X, START_GAP } = constants;
  const firstCell = Math.floor((BOSS_SCREEN_X - START_GAP + 900) / CELL);
  const obstacleCount = Math.floor((floor.length - 1400) / 570);
  const traps = [];
  let cell = firstCell;
  for (let i = 0; i < obstacleCount; i++) {
    const roll = random();
    const type = roll < 0.36 ? "Lava" : roll < 0.68 ? "Spike" : "Minion";
    const width = type === "Lava" ? 1 + Math.floor(random() * 4) : 1;
    for (let w = 0; w < width; w++) {
      traps.push({
        id: `${seed}-${i}-${w}`,
        type,
        cell: cell + w,
        x: (cell + w) * CELL + CELL / 2,
        y: constants.GROUND_Y,
        damage: type === "Lava" ? 24 : type === "Spike" ? 22 : 9,
        state: type === "Spike" ? "hang" : "idle",
        stats: {
          damage: type === "Lava" ? 24 : type === "Spike" ? 22 : 9,
          hp: 1,
          spiked: false,
          fireInterval: 2.4,
        },
        hp: 1,
        vy: 0,
        timer: 0,
        fireTimer: 0.6,
      });
    }
    cell += width + 11 + Math.floor(random() * 5);
  }
  return traps;
}

function makeTrapManager(traps) {
  return {
    fireballs: [],
    getClusters() {
      const active = traps.filter((trap) => trap.state !== "dead" && (trap.type !== "Spike" || trap.state === "landed"));
      const byCell = [...active].sort((a, b) => a.cell - b.cell);
      const clusters = [];
      for (const trap of byCell) {
        const previous = clusters[clusters.length - 1];
        if (previous && trap.cell === previous.lastCell + 1) {
          previous.lastCell = trap.cell;
          previous.x1 = (trap.cell + 1) * constants.CELL;
          previous.traps.push(trap);
          previous.height = Math.max(previous.height, trap.type === "Lava" ? 0 : trap.type === "Spike" ? constants.SPIKE_H : constants.MINION_H);
          if (trap.type !== "Lava") previous.kind = "solid";
        } else {
          clusters.push({
            x0: trap.cell * constants.CELL,
            x1: (trap.cell + 1) * constants.CELL,
            kind: trap.type === "Lava" ? "lava" : "solid",
            height: trap.type === "Lava" ? 0 : trap.type === "Spike" ? constants.SPIKE_H : constants.MINION_H,
            traps: [trap],
            key: `${trap.cell}`,
            lastCell: trap.cell,
          });
        }
      }
      for (const cluster of clusters) cluster.key = `${cluster.x0}:${cluster.x1}`;
      return clusters;
    },
  };
}

function simulateRun(floor, character, layout, seed) {
  const oldRandom = Math.random;
  Math.random = makeRandom(seed ^ 0x63d83595);
  try {
    const fx = { burst() {}, text() {}, ring() {} };
    const scene = { add: { image: () => new DisplayObject() } };
    const { BOSS_SCREEN_X, START_GAP, HERO_HALF_W, GROUND_Y } = constants;
    const hero = new HeroAIController(scene, floor, character, BOSS_SCREEN_X - START_GAP, fx);
    const traps = layout.map((trap) => ({ ...trap, stats: { ...trap.stats } }));
    const trapManager = makeTrapManager(traps);
    let bossX = BOSS_SCREEN_X;
    const exitX = BOSS_SCREEN_X + floor.length;
    let bossHp = 100;
    let time = 0;
    let firstContactTime = null;
    let bossDefeated = false;
    let spikesTriggered = 0;
    let minionStomps = 0;
    let trapHits = 0;
    const dt = 1 / 60;
    const maxFrames = Math.ceil((floor.length / 250 + 5) / dt);

    for (let frame = 0; frame < maxFrames && hero.alive && bossX < exitX; frame++) {
      time += dt;
      bossX += 250 * dt;
      hero.update(dt, trapManager, bossX, true);

      for (const trap of traps) {
        if (trap.state === "dead") continue;
        if (trap.type === "Lava") {
          const left = trap.cell * constants.CELL + 8;
          const right = (trap.cell + 1) * constants.CELL - 8;
          if (hero.alive && hero.onGround && hero.canBeHit() && hero.x > left && hero.x < right) {
            if (hero.takeDamage(trap.stats.damage, "lava", hero.x, GROUND_Y - 30)) {
              hero.bounce(900);
              hero.applySlow(0.65, 1);
              trapHits++;
            }
          }
        } else if (trap.type === "Spike") {
          if (trap.state === "hang") {
            const dx = trap.x - hero.x;
            if (hero.alive && dx < constants.SPIKE_TRIGGER_DIST && dx > -20) {
              trap.state = "falling";
              trap.y = GROUND_Y - constants.HANG_OFFSET;
              trap.vy = 0;
              spikesTriggered++;
              hero.notifySpikeFall();
            }
          } else if (trap.state === "falling") {
            trap.vy += 2600 * dt;
            trap.y += trap.vy * dt;
            if (hero.canBeHit() && Math.abs(hero.x - trap.x) < 30 && trap.y > hero.y - constants.HERO_H && trap.y - 56 < hero.y) {
              if (hero.takeDamage(trap.stats.damage, "spike", trap.x, trap.y)) {
                hero.applyStun(0.7);
                trap.state = "dead";
                trapHits++;
                continue;
              }
            }
            if (trap.y >= GROUND_Y) {
              trap.y = GROUND_Y;
              trap.state = "landed";
              trap.timer = 0;
            }
          } else if (trap.state === "landed") {
            trap.timer += dt;
            if (trap.timer > 7) trap.state = "dead";
            else if (hero.canBeHit() && Math.abs(hero.x - trap.x) < 30 && hero.y > GROUND_Y - constants.SPIKE_H + 6) {
              if (hero.takeDamage(Math.round(trap.stats.damage * 0.7), "spike", trap.x, GROUND_Y - 30)) {
                hero.applyStun(0.45);
                trap.state = "dead";
                trapHits++;
              }
            }
          }
        } else if (trap.type === "Minion" && hero.alive) {
          const top = GROUND_Y - constants.MINION_H;
          if (Math.abs(hero.x - trap.x) < 30) {
            if (!hero.onGround && hero.vy > 0 && hero.prevY <= top + 8 && hero.y >= top) {
              hero.bounce(540);
              minionStomps++;
              trap.hp -= 1;
              if (trap.hp <= 0) trap.state = "dead";
              continue;
            }
            if (hero.canBeHit() && hero.y > top + 6 && hero.takeDamage(trap.stats.damage, "contact", trap.x, top)) {
              hero.applyStun(0.25);
              trapHits++;
            }
          }
        }
      }

      if (hero.alive && hero.contactCd <= 0 && hero.x + HERO_HALF_W >= bossX - 60) {
        if (firstContactTime === null) firstContactTime = time;
        bossHp = Math.max(0, bossHp - floor.contactDamage);
        if (bossHp <= 0) {
          bossDefeated = true;
          break;
        }
        hero.contactCd = 1.3;
        hero.knockback(760);
        hero.applyStun(0.55);
      }
    }
    return {
      defeated: !hero.alive,
      bossDefeated,
      escaped: hero.alive && !bossDefeated,
      time,
      firstContactTime,
      hp: hero.health,
      trapHits,
      spikesTriggered,
      minionStomps,
    };
  } finally {
    Math.random = oldRandom;
  }
}

function profileWithBaselineBehavior(character) {
  return { ...character, behavior: { spikeReactionBonus: 0, stompChanceBonus: 0 } };
}

const samples = 1200;
const summaries = [];
for (const floor of FLOORS) {
  const tuned = HERO_CHARACTERS[floor.heroId];
  const baseline = profileWithBaselineBehavior(tuned);
  let baselineDefeats = 0;
  let tunedDefeats = 0;
  let baselineBossDefeats = 0;
  let tunedBossDefeats = 0;
  let baselineEscapes = 0;
  let tunedEscapes = 0;
  let baselineHp = 0;
  let tunedHp = 0;
  let baselineHits = 0;
  let tunedHits = 0;
  let baselineStomps = 0;
  let tunedStomps = 0;
  let baselineContactCount = 0;
  let tunedContactCount = 0;
  let baselineContactTime = 0;
  let tunedContactTime = 0;

  for (let seed = 1; seed <= samples; seed++) {
    const scenario = makeScenario(floor, seed * 101 + floor.id);
    const before = simulateRun(floor, baseline, scenario, seed * 7919 + floor.id);
    const after = simulateRun(floor, tuned, scenario, seed * 7919 + floor.id);
    if (before.defeated) baselineDefeats++;
    if (after.defeated) tunedDefeats++;
    if (before.bossDefeated) baselineBossDefeats++;
    if (after.bossDefeated) tunedBossDefeats++;
    if (before.escaped) baselineEscapes++;
    if (after.escaped) tunedEscapes++;
    if (before.firstContactTime !== null) {
      baselineContactCount++;
      baselineContactTime += before.firstContactTime;
    }
    if (after.firstContactTime !== null) {
      tunedContactCount++;
      tunedContactTime += after.firstContactTime;
    }
    baselineHp += before.hp / floor.heroHp;
    tunedHp += after.hp / floor.heroHp;
    baselineHits += before.trapHits;
    tunedHits += after.trapHits;
    baselineStomps += before.minionStomps;
    tunedStomps += after.minionStomps;
  }

  const baseRate = baselineDefeats / samples;
  const tunedRate = tunedDefeats / samples;
  summaries.push({
    floor: floor.sub,
    hero: tuned.name,
    baseRate,
    tunedRate,
    rateDelta: tunedRate - baseRate,
    baseBossDefeat: baselineBossDefeats / samples,
    tunedBossDefeat: tunedBossDefeats / samples,
    baseEscape: baselineEscapes / samples,
    tunedEscape: tunedEscapes / samples,
    baseContactRate: baselineContactCount / samples,
    tunedContactRate: tunedContactCount / samples,
    baseContactTime: baselineContactCount ? baselineContactTime / baselineContactCount : null,
    tunedContactTime: tunedContactCount ? tunedContactTime / tunedContactCount : null,
    baseHp: baselineHp / samples,
    tunedHp: tunedHp / samples,
    baseHits: baselineHits / samples,
    tunedHits: tunedHits / samples,
    baseStomps: baselineStomps / samples,
    tunedStomps: tunedStomps / samples,
  });
}

for (const result of summaries) {
  assert.ok(Math.abs(result.rateDelta) <= 0.03, `${result.floor} hero defeat rate changed by more than 3 percentage points`);
  assert.ok(Math.abs(result.baseBossDefeat - result.tunedBossDefeat) <= 0.08, `${result.floor} boss defeat rate changed by more than 8 percentage points`);
  assert.ok(Math.abs(result.baseHp - result.tunedHp) <= 0.05, `${result.floor} remaining HP changed by more than 5 percentage points`);
  if (result.baseContactTime !== null && result.tunedContactTime !== null) {
    assert.ok(Math.abs(result.baseContactTime - result.tunedContactTime) <= 3, `${result.floor} mean contact time shifted by more than 3 seconds`);
  }
}

console.log(`Approximate paired encounter simulation: ${samples} seeds per floor, baseline profile vs character tuning.`);
console.log("This uses the production HeroAIController and representative synthetic trap layouts; it is not a full Phaser rendering or all-player trap-strategy simulation.");
for (const result of summaries) {
  console.log(
    `${result.floor} ${result.hero}: defeat ${(result.baseRate * 100).toFixed(1)}% → ${(result.tunedRate * 100).toFixed(1)}% ` +
    `(${result.rateDelta >= 0 ? "+" : ""}${(result.rateDelta * 100).toFixed(1)} pp), ` +
    `boss defeat ${(result.baseBossDefeat * 100).toFixed(1)}% → ${(result.tunedBossDefeat * 100).toFixed(1)}%, ` +
    `escape ${(result.baseEscape * 100).toFixed(1)}% → ${(result.tunedEscape * 100).toFixed(1)}%, ` +
    `contact ${result.baseContactRate ? `${(result.baseContactRate * 100).toFixed(1)}% @ ${result.baseContactTime.toFixed(1)}s` : "none"} → ` +
    `${result.tunedContactRate ? `${(result.tunedContactRate * 100).toFixed(1)}% @ ${result.tunedContactTime.toFixed(1)}s` : "none"}, ` +
    `remaining HP ${(result.baseHp * 100).toFixed(1)}% → ${(result.tunedHp * 100).toFixed(1)}%, ` +
    `hits ${result.baseHits.toFixed(2)} → ${result.tunedHits.toFixed(2)}, stomps ${result.baseStomps.toFixed(2)} → ${result.tunedStomps.toFixed(2)}`
  );
}
