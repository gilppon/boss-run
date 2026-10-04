import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

function loadTypeScriptModule(filePath) {
  const source = readFile(filePath, "utf8");
  return source.then((contents) => {
    const { outputText, diagnostics } = ts.transpileModule(contents, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      reportDiagnostics: true,
    });
    assert.equal(diagnostics?.length ?? 0, 0, `${filePath} should transpile without diagnostics`);
    const module = { exports: {} };
    const requireFromModule = (id) => {
      throw new Error(`Unexpected runtime dependency in ${filePath}: ${id}`);
    };
    new Function("exports", "require", "module", outputText)(module.exports, requireFromModule, module);
    return module.exports;
  });
}

const [{ FLOORS, HERO_CHARACTERS }, { minionStompChance, spikeReactionChance }] = await Promise.all([
  loadTypeScriptModule(new URL("../src/game/config.ts", import.meta.url)),
  loadTypeScriptModule(new URL("../src/game/characterBehavior.ts", import.meta.url)),
]);

assert.equal(FLOORS.length, 5, "all five dungeon floors should be configured");
assert.equal(Object.keys(HERO_CHARACTERS).length, FLOORS.length, "every floor hero should have one profile");
assert.equal(new Set(FLOORS.map((floor) => floor.heroId)).size, FLOORS.length, "floor hero IDs should be unique");
assert.equal(new Set(Object.values(HERO_CHARACTERS).map((hero) => hero.silhouette)).size, FLOORS.length, "hero silhouettes should be distinct");

const results = [];
for (const floor of FLOORS) {
  const hero = HERO_CHARACTERS[floor.heroId];
  assert.ok(hero, `floor ${floor.id} must resolve hero ${floor.heroId}`);

  const reaction = spikeReactionChance(floor.heroDodge, hero.behavior.spikeReactionBonus);
  const stomp = minionStompChance(floor.heroSkill, hero.behavior.stompChanceBonus);
  assert.ok(Number.isFinite(reaction) && reaction >= 0 && reaction <= 0.85, `${hero.name} reaction chance must be bounded`);
  assert.ok(Number.isFinite(stomp) && stomp >= 0.05 && stomp <= 0.9, `${hero.name} stomp chance must be bounded`);

  let seed = 0x5f3759df ^ (floor.id + 1);
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const trials = 100_000;
  let reactions = 0;
  let stomps = 0;
  for (let i = 0; i < trials; i++) {
    if (random() < reaction) reactions++;
    if (random() < stomp) stomps++;
  }
  const reactionRate = reactions / trials;
  const stompRate = stomps / trials;
  assert.ok(Math.abs(reactionRate - reaction) < 0.01, `${hero.name} reaction sampling should match its configured chance`);
  assert.ok(Math.abs(stompRate - stomp) < 0.01, `${hero.name} stomp sampling should match its configured chance`);
  results.push({ floor: floor.sub, hero: hero.name, reaction: reaction.toFixed(2), stomp: stomp.toFixed(2) });
}

assert.equal(spikeReactionChance(-1, -1), 0, "reaction chance should clamp below zero");
assert.equal(spikeReactionChance(2, 1), 0.85, "reaction chance should clamp at its maximum");
assert.equal(minionStompChance(-2, -1), 0.05, "stomp chance should clamp at its minimum");
assert.equal(minionStompChance(2, 2), 0.9, "stomp chance should clamp at its maximum");

console.log("Character profile verification passed (100,000 seeded choices per floor):");
for (const result of results) {
  console.log(`${result.floor} | ${result.hero} | spike reaction ${result.reaction} | minion stomp ${result.stomp}`);
}
