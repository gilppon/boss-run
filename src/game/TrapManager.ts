import Phaser from "phaser";
import { CELL, GROUND_Y, HANG_OFFSET, HERO_H, MINION_H, SPIKE_H, SPIKE_TRIGGER_DIST } from "./constants";
import type { Fx } from "./fx";
import type { HeroAIController } from "./HeroAIController";
import { sfx } from "./sfx";
import type { BossTrap, RunConfig, TrapStats, TrapType } from "./types";

export interface TrapEntity extends BossTrap {
  cell: number;
  stats: TrapStats;
  state: "idle" | "hang" | "falling" | "landed" | "dead";
  sprite: Phaser.GameObjects.Image;
  rope?: Phaser.GameObjects.Rectangle;
  capL?: Phaser.GameObjects.Rectangle;
  capR?: Phaser.GameObjects.Rectangle;
  vy: number;
  timer: number;
  fireTimer: number;
  hp: number;
  animT: number;
}

export interface Fireball {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  damage: number;
  alive: boolean;
  jitter?: number;
  trail: number;
}

export interface Cluster {
  x0: number;
  x1: number;
  kind: "lava" | "solid";
  height: number;
  traps: TrapEntity[];
  key: string;
}

export type PlaceCheck = "ok" | "occupied" | "zone" | "locked";

const FIRE_COLORS = [0xffe066, 0xff9a1f, 0xff5a1f];
const RUNE_CELL_INTERVAL = 12;
const RUNE_CELL_OFFSET = 7;
export const RUNE_DAMAGE_BONUS = 0.35;

/**
 * Owns trap spawning, updating and collisions.
 * - Lava: a pit carved into the ground (too wide and it cannot be jumped)
 * - Drop spikes: hang from the ceiling and fall once the hero gets close
 * - Flame minion: shoots fireballs, dies if stomped
 */
export class TrapManager {
  readonly traps: TrapEntity[] = [];
  readonly fireballs: Fireball[] = [];
  private cells = new Map<number, TrapEntity>();
  private seq = 0;
  private lavaT = 0;
  private lavaFrame = 0;
  placed = 0;
  minionKills = 0;

  constructor(
    private scene: Phaser.Scene,
    private cfg: RunConfig,
    private fx: Fx
  ) {}

  cellAt(worldX: number): number {
    return Math.floor(worldX / CELL);
  }

  isRuneCell(cell: number): boolean {
    return this.cfg.floorIndex === 0 && (cell - RUNE_CELL_OFFSET) % RUNE_CELL_INTERVAL === 0;
  }

  placementStats(type: TrapType, cell: number): TrapStats {
    const base = this.cfg.traps[type];
    return this.isRuneCell(cell)
      ? { ...base, damage: Math.round(base.damage * (1 + RUNE_DAMAGE_BONUS)) }
      : base;
  }

  canPlace(type: TrapType, cell: number, minX: number, maxX: number): PlaceCheck {
    if (!this.cfg.traps[type].unlocked) return "locked";
    if (this.cells.has(cell)) return "occupied";
    const left = cell * CELL;
    if (left < minX || left + CELL > maxX) return "zone";
    return "ok";
  }

  place(type: TrapType, cell: number): TrapEntity {
    const stats = this.placementStats(type, cell);
    const x = cell * CELL + CELL / 2;
    const scene = this.scene;
    let sprite: Phaser.GameObjects.Image;
    let state: TrapEntity["state"] = "idle";
    let y = GROUND_Y;
    let rope: Phaser.GameObjects.Rectangle | undefined;
    let capL: Phaser.GameObjects.Rectangle | undefined;
    let capR: Phaser.GameObjects.Rectangle | undefined;

    if (type === "Lava") {
      sprite = scene.add.image(cell * CELL, GROUND_Y - 6, `lava${this.lavaFrame}`).setOrigin(0, 0).setDepth(2);
      sprite.setScale(1, 0.05);
      scene.tweens.add({ targets: sprite, scaleY: 1, duration: 220, ease: "Back.easeOut" });
      capL = scene.add.rectangle(cell * CELL, GROUND_Y - 8, 7, 128, 0x2a1622).setOrigin(0.5, 0).setDepth(3);
      capR = scene.add.rectangle((cell + 1) * CELL, GROUND_Y - 8, 7, 128, 0x2a1622).setOrigin(0.5, 0).setDepth(3);
      this.fx.burst(x, GROUND_Y, 10, { colors: [0xffe066, 0xff7a1f], speed: 200, life: 0.5, up: 260, gravity: 700, size: 0.4 });
    } else if (type === "Spike") {
      y = GROUND_Y - HANG_OFFSET;
      state = "hang";
      sprite = scene.add.image(x, y, "spikeDown").setOrigin(0.5, 1).setDepth(8);
      rope = scene.add.rectangle(x, y - 52, 3, 1000, 0x9ca3af).setOrigin(0.5, 1).setDepth(7);
      sprite.setAlpha(0);
      scene.tweens.add({ targets: sprite, alpha: 1, duration: 160 });
      this.fx.burst(x, y - 30, 6, { colors: [0xe2e8f0, 0x94a3b8], speed: 120, life: 0.35, gravity: 200, size: 0.3 });
    } else {
      sprite = scene.add.image(x, GROUND_Y, stats.spiked ? "minionH" : "minion").setOrigin(0.5, 1).setDepth(8);
      sprite.setScale(0.2);
      scene.tweens.add({ targets: sprite, scale: 1, duration: 260, ease: "Back.easeOut" });
      this.fx.burst(x, GROUND_Y - 10, 12, { colors: [0xff6b5e, 0xc0313f, 0xffb02e], speed: 190, life: 0.45, gravity: 300, size: 0.4 });
    }

    const t: TrapEntity = {
      id: `${type}-${this.seq++}`,
      type,
      x,
      y,
      damage: stats.damage,
      cell,
      stats,
      state,
      sprite,
      rope,
      capL,
      capR,
      vy: 0,
      timer: 0,
      fireTimer: 0.5,
      hp: stats.hp,
      animT: 0,
    };
    this.traps.push(t);
    this.cells.set(cell, t);
    this.placed++;
    this.refreshLavaCaps();
    return t;
  }

  private lavaAt(cell: number): boolean {
    const t = this.cells.get(cell);
    return !!t && t.type === "Lava" && t.state !== "dead";
  }

  private refreshLavaCaps() {
    for (const t of this.traps) {
      if (t.type !== "Lava" || t.state === "dead") continue;
      t.capL?.setVisible(!this.lavaAt(t.cell - 1));
      t.capR?.setVisible(!this.lavaAt(t.cell + 1));
    }
  }

  /** For the AI: group adjacent traps into a single obstacle blob */
  getClusters(): Cluster[] {
    const list: { cell: number; t: TrapEntity; h: number }[] = [];
    for (const t of this.traps) {
      if (t.state === "dead") continue;
      if (t.type === "Spike" && t.state !== "landed") continue;
      list.push({ cell: t.cell, t, h: t.type === "Lava" ? 0 : t.type === "Spike" ? SPIKE_H : MINION_H });
    }
    list.sort((a, b) => a.cell - b.cell);
    const out: Cluster[] = [];
    let cur: (Cluster & { lastCell: number }) | null = null;
    for (const it of list) {
      if (cur && it.cell === cur.lastCell + 1) {
        cur.traps.push(it.t);
        cur.lastCell = it.cell;
        cur.x1 = (it.cell + 1) * CELL;
        cur.height = Math.max(cur.height, it.h);
        if (it.t.type !== "Lava") cur.kind = "solid";
      } else {
        cur = {
          x0: it.cell * CELL,
          x1: (it.cell + 1) * CELL,
          kind: it.t.type === "Lava" ? "lava" : "solid",
          height: it.h,
          traps: [it.t],
          key: "",
          lastCell: it.cell,
        };
        out.push(cur);
      }
    }
    for (const c of out) c.key = `${c.x0}:${c.x1}`;
    return out;
  }

  private kill(t: TrapEntity, showMinionPop = false) {
    if (t.state === "dead") return;
    t.state = "dead";
    if (showMinionPop && t.type === "Minion") {
      this.scene.tweens.killTweensOf(t.sprite);
      this.scene.tweens.add({
        targets: t.sprite,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.12,
        angle: t.sprite.angle + 18,
        duration: 180,
        ease: "Back.easeIn",
        onComplete: () => t.sprite.destroy(),
      });
    } else {
      t.sprite.destroy();
    }
    t.rope?.destroy();
    t.capL?.destroy();
    t.capR?.destroy();
    if (this.cells.get(t.cell) === t) this.cells.delete(t.cell);
  }

  private killFireball(fb: Fireball, boom: boolean) {
    fb.alive = false;
    if (boom) this.fx.burst(fb.x, fb.y, 12, { colors: FIRE_COLORS, speed: 220, life: 0.4, gravity: 200, size: 0.45 });
    fb.sprite.destroy();
  }

  update(dt: number, hero: HeroAIController, cullX: number) {
    // lava surface animation
    this.lavaT += dt;
    if (this.lavaT > 0.26) {
      this.lavaT = 0;
      this.lavaFrame = 1 - this.lavaFrame;
      for (const t of this.traps) if (t.type === "Lava" && t.state !== "dead") t.sprite.setTexture(`lava${this.lavaFrame}`);
      if (Math.random() < 0.5) {
        const lv = this.traps.filter((t) => t.type === "Lava" && t.state !== "dead" && t.x > cullX && t.x < cullX + 1300);
        if (lv.length) {
          const p = lv[Math.floor(Math.random() * lv.length)];
          this.fx.burst(p.x + (Math.random() - 0.5) * 30, GROUND_Y - 4, 2, { colors: [0xffe066, 0xff8a1f], speed: 80, life: 0.5, up: 200, gravity: 500, size: 0.25 });
        }
      }
    }

    for (const t of this.traps) {
      if (t.state === "dead") continue;
      if (t.type === "Lava") this.updateLava(t, hero);
      else if (t.type === "Spike") this.updateSpike(t, dt, hero);
      else this.updateMinion(t, dt, hero);
    }

    for (const fb of this.fireballs) {
      if (!fb.alive) continue;
      fb.x += fb.vx * dt;
      fb.sprite.setPosition(fb.x, fb.y);
      fb.sprite.setScale(1 + Math.sin(fb.trail * 40) * 0.08);
      fb.trail += dt;
      if (Math.random() < dt * 30) {
        this.fx.burst(fb.x + 14, fb.y, 1, { colors: FIRE_COLORS, speed: 40, life: 0.3, gravity: -60, size: 0.28 });
      }
      if (
        hero.canBeHit() &&
        Math.abs(fb.x - hero.x) < 24 &&
        fb.y > hero.y - HERO_H - 6 &&
        fb.y < hero.y + 6
      ) {
        if (hero.takeDamage(fb.damage, "fire", fb.x, fb.y)) {
          hero.applySlow(0.45, 0.5);
          sfx.hit();
        }
        this.killFireball(fb, true);
        continue;
      }
      if (fb.x < cullX - 120) this.killFireball(fb, false);
    }

    // cleanup
    for (let i = this.fireballs.length - 1; i >= 0; i--) if (!this.fireballs[i].alive) this.fireballs.splice(i, 1);
    let changed = false;
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      if (t.state === "dead" || t.x < cullX - 160) {
        this.kill(t);
        this.traps.splice(i, 1);
        changed = true;
      }
    }
    if (changed) this.refreshLavaCaps();
  }

  private updateLava(t: TrapEntity, hero: HeroAIController) {
    if (!hero.alive || !hero.canBeHit()) return;
    const left = t.cell * CELL + (this.lavaAt(t.cell - 1) ? -1 : 8);
    const right = (t.cell + 1) * CELL - (this.lavaAt(t.cell + 1) ? -1 : 8);
    const runeEruption = this.isRuneCell(t.cell) && !hero.onGround && hero.y >= GROUND_Y - 112;
    if (hero.x > left && hero.x < right && (hero.onGround || runeEruption)) {
      if (hero.takeDamage(t.stats.damage, "lava", hero.x, GROUND_Y - 30)) {
        hero.bounce(900);
        hero.applySlow(0.65, 1.0);
        if (runeEruption) {
          this.fx.burst(hero.x, GROUND_Y - 42, 28, { colors: [0xffffff, 0xffe066, 0xffa52f], speed: 420, life: 0.72, up: 520, gravity: 760, size: 0.58 });
          this.fx.ring(hero.x, GROUND_Y - 70, 0xffd166, 18);
        } else {
          this.fx.burst(hero.x, GROUND_Y - 6, 22, { colors: [0xffe066, 0xff8a1f, 0xff3d0e], speed: 340, life: 0.7, up: 380, gravity: 900, size: 0.55 });
          this.fx.ring(hero.x, GROUND_Y - 10, 0xff7a1f, 8);
        }
        sfx.lava();
      }
    }
  }

  private updateSpike(t: TrapEntity, dt: number, hero: HeroAIController) {
    if (t.state === "hang") {
      const dx = t.x - hero.x;
      if (hero.alive && dx < SPIKE_TRIGGER_DIST && dx > -20) {
        t.state = "falling";
        t.vy = 0;
        if (t.rope) {
          const r = t.rope;
          this.scene.tweens.add({ targets: r, alpha: 0, duration: 250, onComplete: () => r.destroy() });
          t.rope = undefined;
        }
        sfx.spikeDrop();
        hero.notifySpikeFall();
      }
      return;
    }
    if (t.state === "falling") {
      t.vy += 2600 * dt;
      t.sprite.y += t.vy * dt;
      const tip = t.sprite.y;
      if (
        hero.canBeHit() &&
        Math.abs(hero.x - t.x) < 30 &&
        tip > hero.y - HERO_H &&
        tip - 56 < hero.y
      ) {
        if (hero.takeDamage(t.stats.damage, "spike", t.x, tip)) {
          hero.applyStun(0.7);
          this.shatter(t, hero.x, hero.y - 20);
          sfx.hit();
          return;
        }
      }
      if (tip >= GROUND_Y) {
        t.sprite.y = GROUND_Y;
        t.sprite.setTexture("spikeGround");
        t.state = "landed";
        t.timer = 0;
        this.fx.burst(t.x, GROUND_Y - 4, 8, { colors: [0xb59aa8, 0xe2e8f0], speed: 160, life: 0.4, up: 120, gravity: 500, size: 0.35, additive: false });
        sfx.spikeLand();
      }
      return;
    }
    if (t.state === "landed") {
      t.timer += dt;
      if (t.timer > 7) {
        this.kill(t);
        return;
      }
      if (
        hero.canBeHit() &&
        Math.abs(hero.x - t.x) < 30 &&
        hero.y > GROUND_Y - SPIKE_H + 6
      ) {
        if (hero.takeDamage(Math.round(t.stats.damage * 0.7), "spike", t.x, GROUND_Y - 30)) {
          hero.applyStun(0.45);
          this.shatter(t, t.x, GROUND_Y - 20);
          sfx.hit();
        }
      }
    }
  }

  private shatter(t: TrapEntity, x: number, y: number) {
    this.fx.burst(x, y, 16, { colors: [0xe2e8f0, 0x94a3b8, 0xff5a5a], speed: 300, life: 0.6, up: 200, gravity: 800, size: 0.4 });
    this.kill(t);
  }

  private updateMinion(t: TrapEntity, dt: number, hero: HeroAIController) {
    if (!hero.alive) return;
    t.animT += dt;
    t.sprite.setY(GROUND_Y - Math.abs(Math.sin(t.animT * 5)) * 2.5);
    t.sprite.setAngle(Math.sin(t.animT * 3) * 3);
    const top = GROUND_Y - MINION_H;
    const adx = Math.abs(hero.x - t.x);

    if (adx < 30) {
      if (!hero.onGround && hero.vy > 0 && hero.prevY <= top + 8 && hero.y >= top) {
        // stomp!
        hero.bounce(540);
        t.hp -= 1;
        sfx.stomp();
        this.fx.burst(t.x, top, 10, { colors: [0xffffff, 0xffe066], speed: 200, life: 0.35, gravity: 300, size: 0.35 });
        this.fx.text(t.x, top - 20, "STOMP!", "#ffe14d", 22);
        this.scene.tweens.add({ targets: t.sprite, scaleY: 0.55, duration: 80, yoyo: true });
        if (t.stats.spiked) {
          hero.takeDamage(Math.round(t.stats.damage * 1.4), "helm", t.x, top);
        }
        if (t.hp <= 0) {
          this.minionKills++;
          this.fx.burst(t.x, GROUND_Y - 22, 16, { colors: [0xff6b5e, 0xc0313f, 0x3b0d18], speed: 260, life: 0.6, up: 160, gravity: 700, size: 0.45 });
          this.kill(t, true);
        }
        return;
      }
      if (hero.canBeHit() && hero.y > top + 6) {
        if (hero.takeDamage(t.stats.damage, "contact", t.x, top)) {
          hero.applyStun(0.25);
          sfx.hit();
        }
      }
    }

    t.fireTimer -= dt;
    const d = t.x - hero.x;
    if (d > 30 && d < 600 && t.fireTimer <= 0) {
      t.fireTimer = t.stats.fireInterval;
      this.shoot(t);
    }
  }

  private shoot(t: TrapEntity) {
    const fx0 = t.x - 24;
    const fy0 = GROUND_Y - 30;
    const sprite = this.scene.add.image(fx0, fy0, "fireball").setOrigin(0.28, 0.5).setDepth(12);
    this.fireballs.push({ sprite, x: fx0, y: fy0, vx: -340, damage: t.stats.damage, alive: true, trail: 0 });
    this.scene.tweens.add({ targets: t.sprite, scaleX: 1.2, scaleY: 0.86, duration: 90, yoyo: true });
    this.fx.burst(fx0, fy0, 6, { colors: FIRE_COLORS, speed: 150, life: 0.3, gravity: 0, size: 0.35 });
    sfx.fire();
  }

  destroy() {
    for (const t of this.traps) this.kill(t);
    this.traps.length = 0;
    for (const fb of this.fireballs) if (fb.alive) fb.sprite.destroy();
    this.fireballs.length = 0;
    this.cells.clear();
  }
}
