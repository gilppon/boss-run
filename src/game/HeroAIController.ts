import Phaser from "phaser";
import { GRAVITY, GROUND_Y, HERO_H, HERO_HALF_W, MINION_H } from "./constants";
import { HeroView } from "./characters";
import type { Fx } from "./fx";
import type { FloorDef, HeroHeroAI } from "./types";
import type { Cluster, TrapManager } from "./TrapManager";

export type DamageSource = "lava" | "spike" | "fire" | "contact" | "helm";

interface JumpPlan {
  c0: number; // jump once past this X (the centre of the window)
  b1: number; // past this X it is already too late
}

/**
 * Hero AI: scans the cluster of traps ahead and, using the jump arc
 * (air time / height), computes the "clearable span" and times the jump.
 * - Lava too wide to clear eventually swallows him
 * - If something else waits at the landing spot he jumps to avoid it when he can
 * - He tries to stomp minions a fixed fraction of the time (Mario style)
 * - He computes the time-to-contact of a fireball and jumps over it
 */
export class HeroAIController {
  x: number;
  y = GROUND_Y;
  vy = 0;
  prevY = GROUND_Y;
  onGround = true;
  health: number;
  readonly maxHealth: number;
  alive = true;
  speed = 0;
  targetDistance = 0;

  readonly view: HeroView;
  private shadow: Phaser.GameObjects.Image;

  onDamage?: (amount: number, source: DamageSource, x: number, y: number) => void;

  // status effects
  stun = 0;
  brake = 0;
  slowMul = 1;
  slowT = 0;
  roarT = 0;
  knockV = 0;
  invul = 0;
  contactCd = 0;
  private jumpCd = 0;
  rage = false;
  private deathT = 0;

  private jitter = new Map<string, number>();
  private stompPref = new Map<string, boolean>();

  constructor(
    scene: Phaser.Scene,
    private floor: FloorDef,
    startX: number,
    private fx: Fx,
    hpScale = 1,
  ) {
    this.x = startX;
    this.health = Math.max(1, Math.round(floor.heroHp * hpScale));
    this.maxHealth = Math.max(1, Math.round(floor.heroHp * hpScale));
    this.shadow = scene.add.image(startX, GROUND_Y + 3, "shadow").setDepth(9).setAlpha(0.8);
    this.view = new HeroView(scene);
    this.view.container.setDepth(10);
    this.view.container.setPosition(startX, GROUND_Y);
  }

  get state(): HeroHeroAI {
    return { x: this.x, y: this.y, speed: this.speed, health: this.health, targetDistance: this.targetDistance };
  }

  get deathDone(): boolean {
    return !this.alive && this.deathT > 1.5;
  }

  canBeHit(): boolean {
    return this.alive && this.invul <= 0;
  }

  // ---------- effects called from outside ----------
  takeDamage(amount: number, source: DamageSource, hx = this.x, hy = this.y - 30): number {
    if (!this.canBeHit()) return 0;
    this.health = Math.max(0, this.health - amount);
    this.invul = 0.55;
    this.view.flash();
    this.onDamage?.(amount, source, hx, hy);
    if (this.health <= 0) this.die();
    else if (this.health / this.maxHealth < 0.35) this.rage = true;
    return amount;
  }

  applySlow(mul: number, t: number) {
    this.slowMul = this.slowT > 0 ? Math.min(this.slowMul, mul) : mul;
    this.slowT = Math.max(this.slowT, t);
  }

  applyStun(t: number) {
    this.stun = Math.max(this.stun, t);
  }

  knockback(v: number) {
    this.knockV = -Math.abs(v);
  }

  bounce(v: number) {
    this.vy = -v;
    this.onGround = false;
  }

  /** Notices that a drop spike has started falling */
  notifySpikeFall() {
    if (this.onGround && Math.random() < this.floor.heroDodge) {
      this.brake = 0.55;
      this.fx.text(this.x, this.y - 84, "!", "#ffe14d", 34);
    }
  }

  private die() {
    this.alive = false;
    this.vy = -760;
    this.onGround = false;
    this.deathT = 0;
    this.speed = 0;
  }

  // ---------- main update ----------
  update(dt: number, tm: TrapManager, bossX: number, active: boolean) {
    this.prevY = this.y;
    if (!this.alive) {
      this.updateDeath(dt);
      return;
    }

    this.stun = Math.max(0, this.stun - dt);
    this.brake = Math.max(0, this.brake - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.roarT = Math.max(0, this.roarT - dt);
    this.invul = Math.max(0, this.invul - dt);
    this.contactCd = Math.max(0, this.contactCd - dt);
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    if (this.knockV < 0) this.knockV = Math.min(0, this.knockV + 2300 * dt);

    this.targetDistance = bossX - this.x;

    let mul = 1;
    if (this.stun > 0 || this.brake > 0) mul = 0;
    else {
      if (this.slowT > 0) mul = Math.min(mul, this.slowMul);
      if (this.roarT > 0) mul = Math.min(mul, 0.5);
    }
    let sp = this.floor.heroSpeed * (this.rage ? 1.08 : 1) * mul;
    // too far behind -> the hero sprints to catch up (rubber band)
    if (this.targetDistance > 640 && mul > 0) sp *= 1 + Math.min((this.targetDistance - 640) / 400, 0.5);
    if (!active) sp = 0;
    this.speed = sp;

    if (active) this.think(tm);

    this.x += (sp + this.knockV) * dt;

    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
        this.fx.burst(this.x, GROUND_Y, 5, { colors: [0xb59aa8, 0x8a6a7a], speed: 90, life: 0.35, gravity: 120, size: 0.35, additive: false });
      }
    }

    this.syncView(dt);
  }

  private syncView(dt: number) {
    const c = this.view.container;
    c.setPosition(this.x, this.y);
    c.rotation = 0;
    c.alpha = this.invul > 0 && Math.floor(this.invul * 22) % 2 === 0 ? 0.4 : 1;
    this.view.update(dt, this.speed, this.onGround, false);
    const h = Math.max(0, GROUND_Y - this.y);
    this.shadow.setPosition(this.x, GROUND_Y + 3).setScale(Math.max(0.4, 1 - h / 300) * 0.9, 1).setAlpha(0.8);
  }

  private updateDeath(dt: number) {
    this.deathT += dt;
    this.vy += GRAVITY * dt;
    this.y += this.vy * dt;
    this.x -= 40 * dt;
    const c = this.view.container;
    c.setPosition(this.x, this.y);
    c.rotation += 5 * dt;
    c.alpha = 1;
    this.view.update(dt, 0, false, true);
    this.shadow.setAlpha(0);
  }

  // ---------- AI ----------
  private jump() {
    this.vy = -this.floor.heroJump;
    this.onGround = false;
    this.jumpCd = 0.06;
    this.fx.burst(this.x, GROUND_Y, 4, { colors: [0xb59aa8], speed: 80, life: 0.3, gravity: 100, size: 0.3, additive: false });
  }

  private rollJitterT(): number {
    const s = 1 - this.floor.heroSkill;
    let j = (Math.random() * 2 - 1) * s * 0.28;
    if (Math.random() < this.floor.heroBlunder) j += (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 0.2);
    return j;
  }

  private rollJitterPx(): number {
    const s = 1 - this.floor.heroSkill;
    let j = (Math.random() * 2 - 1) * s * 70;
    if (Math.random() < this.floor.heroBlunder) j += (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 60);
    return j;
  }

  private think(tm: TrapManager) {
    if (!this.onGround || this.stun > 0 || this.brake > 0 || this.jumpCd > 0) return;
    const v = this.speed;
    if (v < 30) return;
    const apexT = this.floor.heroJump / GRAVITY;

    // 1) incoming fireball
    for (const fb of tm.fireballs) {
      if (!fb.alive || fb.x <= this.x) continue;
      const d = fb.x - this.x;
      if (d > 520) continue;
      if (fb.jitter === undefined) fb.jitter = this.rollJitterT();
      const tc = (d - 26) / (v + Math.abs(fb.vx));
      if (tc > 0.02 && tc <= apexT + fb.jitter) {
        this.jump();
        return;
      }
    }

    // 2) the cluster of traps ahead
    const clusters = tm.getClusters();
    for (const c of clusters) {
      if (c.x1 + HERO_HALF_W < this.x) continue;
      if (c.x0 - this.x > 560) break; // too far to see it yet
      const plan = this.plan(c, clusters, v);
      if (!plan) continue;
      if (this.x >= plan.c0 && this.x <= plan.b1) {
        this.jump();
        return;
      }
      if (this.x < plan.c0) break; // handle the nearest one first
    }
  }

  private landingSafe(c0: number, v: number, T: number, self: Cluster, all: Cluster[]): boolean {
    const landX = c0 + v * T;
    for (const o of all) {
      if (o === self) continue;
      const pad = 6;
      if (o.kind === "lava") {
        if (landX > o.x0 + 8 - pad && landX < o.x1 - 8 + pad) return false;
      } else if (landX > o.x0 - HERO_HALF_W - pad && landX < o.x1 + HERO_HALF_W + pad) return false;
    }
    return true;
  }

  private plan(c: Cluster, all: Cluster[], v: number): JumpPlan | null {
    const vy0 = this.floor.heroJump;
    const g = GRAVITY;
    const T = (2 * vy0) / g;

    let b0: number;
    let b1: number;
    let h: number;
    if (c.kind === "lava") {
      b0 = c.x0 + 8;
      b1 = c.x1 - 8;
      h = 0;
    } else {
      b0 = c.x0 - HERO_HALF_W;
      b1 = c.x1 + HERO_HALF_W;
      h = c.height + 4;
    }
    let t1 = 0;
    let t2 = T;
    if (h > 0) {
      const disc = vy0 * vy0 - 2 * g * h;
      if (disc <= 0) return null;
      const r = Math.sqrt(disc);
      t1 = (vy0 - r) / g;
      t2 = (vy0 + r) / g;
    }

    if (!this.jitter.has(c.key)) this.jitter.set(c.key, this.rollJitterPx());
    const jit = this.jitter.get(c.key)!;

    // stomp a minion (single, and not the spiked helm)
    if (c.traps.length === 1 && c.traps[0].type === "Minion" && !c.traps[0].stats.spiked) {
      if (!this.stompPref.has(c.key)) {
        this.stompPref.set(c.key, Math.random() < 0.3 + this.floor.heroSkill * 0.5);
      }
      if (this.stompPref.get(c.key)) {
        const disc = vy0 * vy0 - 2 * g * MINION_H;
        if (disc > 0) {
          const ts = (vy0 + Math.sqrt(disc)) / g;
          const mid = (c.x0 + c.x1) / 2;
          return { c0: mid - v * ts + jit * 0.5, b1: mid };
        }
      }
    }

    const lo = b1 - v * t2;
    const hi = b0 - v * t1;
    let base = (lo + hi) / 2;
    if (lo <= hi) {
      const span = hi - lo;
      const steps = Math.min(8, Math.floor(span / 6));
      const half = span / 2;
      let found = false;
      for (let i = 0; i <= steps && !found; i++) {
        const offs = i === 0 ? [0] : [-1, 1];
        for (const sgn of offs) {
          const cand = base + sgn * (steps > 0 ? (i / steps) * half : 0);
          if (this.landingSafe(cand, v, T, c, all)) {
            base = cand;
            found = true;
            break;
          }
        }
      }
      if (!found) base = (lo + hi) / 2;
    }
    return { c0: base + jit, b1 };
  }

  get bounds() {
    return { l: this.x - HERO_HALF_W, r: this.x + HERO_HALF_W, t: this.y - HERO_H, b: this.y };
  }

  destroy() {
    this.view.container.destroy();
    this.shadow.destroy();
  }
}
