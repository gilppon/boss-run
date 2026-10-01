import Phaser from "phaser";
import { BossView } from "./characters";
import {
  BOSS_SCREEN_X,
  CELL,
  GROUND_Y,
  H,
  HERO_HALF_W,
  HERO_H,
  INTRO_TIME,
  START_GAP,
  W,
} from "./constants";
import { TRAP_DEFS } from "./config";
import { bus } from "./bus";
import { Fx, FONT } from "./fx";
import { HeroAIController } from "./HeroAIController";
import { sfx } from "./sfx";
import { createTextures } from "./textures";
import { TrapManager } from "./TrapManager";
import type { EndReason, HudState, RunConfig, RunResult, TrapType } from "./types";

export interface SceneInit {
  config: RunConfig;
  backdrop: HTMLImageElement | null;
}

/**
 * 역발상 러너의 메인 씬.
 * 유저는 마왕(보스)이 되어 앞으로 달리고, 뒤에서 쫓아오는 용사의 진행 경로에
 * 트랩을 즉석 설치한다. 월드는 보스 기준으로 스크롤된다.
 */
export class BossScene extends Phaser.Scene {
  private cfg!: RunConfig;
  private backdropImg: HTMLImageElement | null = null;

  private fx!: Fx;
  private tm!: TrapManager;
  private hero!: HeroAIController;
  private bossView!: BossView;
  private bossShadow!: Phaser.GameObjects.Image;
  private heroBar!: Phaser.GameObjects.Graphics;
  private zoneG!: Phaser.GameObjects.Graphics;
  private ghostIcon!: Phaser.GameObjects.Text;
  private ground!: Phaser.GameObjects.TileSprite;
  private pillars!: Phaser.GameObjects.TileSprite;
  private bgImgs: Phaser.GameObjects.Image[] = [];

  private bossX = BOSS_SCREEN_X;
  private startX = BOSS_SCREEN_X;
  private exitX = 0;
  private bossHalfW = 60;
  private bossHp = 100;
  private mana = 100;
  private roarCd = 0;
  private selected: TrapType = "Lava";

  private t = 0;
  private introT = 0;
  private started = false;
  private ended = false;
  private paused = false;
  private dragging = false;
  private hasPointer = false;
  private lastPaintCell: number | null = null;
  private hudT = 0;
  private dustT = 0;
  private emberT = 0;
  private lastDeny = -10;
  private trapHits = 0;
  private combo = 0;
  private lastHit = -10;
  private offs: Array<() => void> = [];
  private cleaned = false;

  constructor() {
    super("BossScene");
  }

  init(data: SceneInit) {
    this.cfg = data.config;
    this.backdropImg = data.backdrop;
    this.bgImgs = [];
    this.offs = [];
    this.cleaned = false;
    this.bossX = BOSS_SCREEN_X;
    this.startX = BOSS_SCREEN_X;
    this.exitX = this.startX + data.config.floor.length;
    this.bossHp = data.config.boss.maxHp;
    this.mana = data.config.boss.maxMana;
    this.roarCd = 0;
    this.selected = "Lava";
    this.t = 0;
    this.introT = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.dragging = false;
    this.hasPointer = false;
    this.lastPaintCell = null;
    this.hudT = 0;
    this.trapHits = 0;
    this.combo = 0;
    this.lastHit = -10;
    this.bossHalfW = 60 * data.config.boss.scale;
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor("#12060d");
    createTextures(this);

    // ----- 배경 (반전 반복으로 이음새 없는 패럴랙스) -----
    if (this.backdropImg) {
      if (this.textures.exists("bg")) this.textures.remove("bg");
      this.textures.addImage("bg", this.backdropImg);
      for (let i = 0; i < 3; i++) {
        const img = this.add.image(0, 0, "bg").setOrigin(0, 0).setDisplaySize(W, H).setScrollFactor(0).setDepth(-10);
        img.setFlipX(i % 2 === 1);
        this.bgImgs.push(img);
      }
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x12060d, this.backdropImg ? 0.35 : 1).setScrollFactor(0).setDepth(-9);
    this.pillars = this.add
      .tileSprite(0, 0, W, H, "pillars")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-5)
      .setAlpha(0.75);

    // ----- 지면 -----
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W + 96, 170, "ground")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1);

    // ----- 출구 성문 -----
    const glow = this.add
      .image(this.exitX + 60, GROUND_Y - 150, "dot")
      .setTint(0xffe28a)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(26)
      .setAlpha(0.35)
      .setDepth(4);
    this.tweens.add({ targets: glow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 });
    this.add
      .image(this.exitX + 60, GROUND_Y, "exitGate")
      .setOrigin(0.5, 1)
      .setDepth(5);

    // ----- 이펙트/트랩/캐릭터 -----
    this.fx = new Fx(this);
    this.tm = new TrapManager(this, this.cfg, this.fx);

    this.zoneG = this.add.graphics().setDepth(4);
    this.ghostIcon = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "28px" }).setOrigin(0.5).setDepth(15).setVisible(false);

    this.bossShadow = this.add.image(this.bossX, GROUND_Y + 4, "shadow").setDepth(9);
    this.bossShadow.setScale(this.cfg.boss.scale * 1.6, this.cfg.boss.scale * 1.1);
    this.bossView = new BossView(this, this.cfg.boss.def);
    this.bossView.container.setDepth(11);
    this.bossView.setBaseY(GROUND_Y);
    this.bossView.container.setPosition(this.bossX, GROUND_Y);

    this.hero = new HeroAIController(this, this.cfg.floor, this.bossX - START_GAP, this.fx, this.cfg.heroHpScale ?? 1);
    this.hero.onDamage = (amount, source, x, y) => this.onHeroDamaged(amount, source, x, y);
    this.heroBar = this.add.graphics().setDepth(40);

    this.add.image(W / 2, H / 2, "vignette").setScrollFactor(0).setDepth(30);

    // ----- 입력 -----
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.ended || this.paused) return;
      this.hasPointer = true;
      if (p.rightButtonDown()) {
        this.castRoar();
        return;
      }
      this.dragging = true;
      this.lastPaintCell = null;
      this.paintAt(p.x + cam.scrollX, true);
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      this.hasPointer = true;
      if (this.dragging && p.isDown && !this.ended && !this.paused) this.paintAt(p.x + cam.scrollX, false);
    });
    const release = (p: Phaser.Input.Pointer) => {
      this.dragging = false;
      this.lastPaintCell = null;
      if (p.wasTouch) this.hasPointer = false;
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("gameout", () => {
      this.hasPointer = false;
      this.dragging = false;
      this.lastPaintCell = null;
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.addCapture("SPACE");
      kb.on("keydown-ONE", () => this.select("Lava"));
      kb.on("keydown-TWO", () => this.select("Spike"));
      kb.on("keydown-THREE", () => this.select("Minion"));
      kb.on("keydown-SPACE", () => this.castRoar());
    }

    this.offs.push(bus.on("select", (t: TrapType) => this.select(t)));
    this.offs.push(bus.on("roar", () => this.castRoar()));
    this.offs.push(bus.on("pause", (v: boolean) => this.setPaused(v)));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    this.fx.banner(W / 2, 250, "준비!", "#ffe14d", 80, 1100);
    this.emitHud();
    bus.emit("ready");
  }

  private cleanup() {
    if (this.cleaned) return;
    this.cleaned = true;
    this.offs.forEach((f) => f());
    this.offs = [];
  }

  // ---------------- 입력 로직 ----------------
  private select(t: TrapType) {
    if (!this.cfg.traps[t].unlocked) return;
    this.selected = t;
    sfx.click();
    this.emitHud();
  }

  private setPaused(v: boolean) {
    this.paused = v;
    if (v) {
      this.tweens.pauseAll();
      this.dragging = false;
    } else this.tweens.resumeAll();
  }

  private zone(): [number, number] {
    return [this.hero.x + 30, this.bossX - this.bossHalfW - 24];
  }

  private paintAt(worldX: number, fromClick: boolean) {
    const cell = this.tm.cellAt(worldX);
    if (fromClick || this.lastPaintCell === null) {
      this.placeCell(cell, fromClick);
    } else {
      // 드래그가 빠를 때 칸을 건너뛰지 않도록 보간
      const step = cell >= this.lastPaintCell ? 1 : -1;
      for (let c = this.lastPaintCell + step; step > 0 ? c <= cell : c >= cell; c += step) {
        if (!this.placeCell(c, false)) break;
      }
    }
    this.lastPaintCell = cell;
  }

  /** 반환: 계속 진행 가능한지(마나 부족이면 false) */
  private placeCell(cell: number, fromClick: boolean): boolean {
    const [minX, maxX] = this.zone();
    const chk = this.tm.canPlace(this.selected, cell, minX, maxX);
    const cx = cell * CELL + CELL / 2;
    if (chk === "ok") {
      const cost = this.cfg.traps[this.selected].cost;
      if (this.mana < cost) {
        this.deny(cx, "마나 부족!");
        return false;
      }
      this.mana -= cost;
      this.tm.place(this.selected, cell);
      sfx.place();
      return true;
    }
    if (fromClick && chk === "zone") this.deny(cx, "용사 앞에만 설치 가능!");
    return true;
  }

  private deny(x: number, msg: string) {
    if (this.t - this.lastDeny < 0.6) return;
    this.lastDeny = this.t;
    this.fx.text(x, GROUND_Y - 90, msg, "#ff8a8a", 22);
    sfx.denied();
    bus.emit("nomana");
  }

  private castRoar() {
    if (!this.started || this.ended || this.paused || this.roarCd > 0) return;
    this.roarCd = this.cfg.boss.roarCooldown;
    const power = this.cfg.boss.roarPower;
    sfx.roar();
    this.bossView.roar();
    this.cameras.main.shake(320, 0.012);
    this.fx.ring(this.bossX - 20, GROUND_Y - 100, 0xff6a3d, 16 * power);
    this.fx.ring(this.bossX - 20, GROUND_Y - 100, 0xffe28a, 10 * power);
    this.fx.burst(this.bossX - 40, GROUND_Y - 60, 26, { colors: [0xffe28a, 0xff6a3d], speed: 420, life: 0.6, gravity: 0, size: 0.5, spreadX: 1.4 });
    this.fx.text(this.bossX - 40, GROUND_Y - 230 * this.cfg.boss.scale, "포효!", "#ffb02e", 34);
    if (this.hero.alive) {
      this.hero.knockback(1000 * Math.sqrt(power));
      this.hero.roarT = 2.5;
      this.hero.applyStun(0.25);
    }
    this.emitHud();
  }

  // ---------------- 전투 이벤트 ----------------
  private onHeroDamaged(amount: number, _source: string, x: number, y: number) {
    this.trapHits++;
    this.fx.text(x, y - 18, `-${Math.round(amount)}`, "#ff5a5a", 28 + Math.min(amount / 3, 16));
    this.cameras.main.shake(110, 0.004);
    if (this.t - this.lastHit < 3.5) this.combo++;
    else this.combo = 1;
    this.lastHit = this.t;
    if (this.combo >= 2) this.fx.text(x, y - 56, `COMBO x${this.combo}`, "#ffe14d", 22);
  }

  private bossHit() {
    const dmg = this.cfg.floor.contactDamage;
    this.bossHp = Math.max(0, this.bossHp - dmg);
    this.hero.contactCd = 1.3;
    this.hero.knockback(760);
    this.hero.applyStun(0.55);
    this.bossView.flash();
    sfx.bossHurt();
    this.cameras.main.shake(260, 0.014);
    this.fx.text(this.bossX - 20, GROUND_Y - 200 * this.cfg.boss.scale, `-${dmg}`, "#ff3b3b", 40);
    this.fx.burst(this.bossX - this.bossHalfW, GROUND_Y - 80, 18, { colors: [0xffffff, 0xff5a5a, 0xffe14d], speed: 320, life: 0.5, gravity: 500, size: 0.5 });
    if (this.bossHp <= 0) this.finish("boss-defeated");
  }

  private finish(reason: EndReason) {
    if (this.ended) return;
    this.ended = true;
    this.dragging = false;
    const won = reason === "hero-defeated";
    const c = this.cfg;
    const result: RunResult = {
      won,
      reason,
      time: Math.max(0, this.t - INTRO_TIME),
      distancePct: Phaser.Math.Clamp((this.bossX - this.startX) / c.floor.length, 0, 1),
      heroDamagePct: Phaser.Math.Clamp((this.hero.maxHealth - this.hero.health) / this.hero.maxHealth, 0, 1),
      bossHpPct: Phaser.Math.Clamp(this.bossHp / c.boss.maxHp, 0, 1),
      trapsPlaced: this.tm.placed,
      minionKills: this.tm.minionKills,
      trapHits: this.trapHits,
    };
    if (won) {
      sfx.win();
      this.fx.banner(W / 2, 260, "용사 퇴치!", "#ffe14d", 84, 1600);
      this.bossView.roar();
      this.cameras.main.flash(300, 255, 220, 120);
    } else {
      sfx.lose();
      const msg = reason === "boss-defeated" ? "마왕 쓰러짐..." : "탈출 실패!";
      this.fx.banner(W / 2, 260, msg, "#ff6b6b", 72, 1600);
    }
    this.emitHud();
    this.time.delayedCall(won ? 1900 : 1500, () => bus.emit("end", result));
  }

  // ---------------- HUD ----------------
  private emitHud() {
    const c = this.cfg;
    const h = this.hero;
    if (this.t - this.lastHit > 3.5) this.combo = 0;
    const st: HudState = {
      bossHp: this.bossHp,
      bossMaxHp: c.boss.maxHp,
      heroHp: h.health,
      heroMaxHp: h.maxHealth,
      heroName: c.floor.heroName,
      mana: this.mana,
      maxMana: c.boss.maxMana,
      bossProgress: Phaser.Math.Clamp((this.bossX - this.startX) / c.floor.length, 0, 1),
      heroProgress: Phaser.Math.Clamp((h.x - this.startX) / c.floor.length, 0, 1),
      gap: this.bossX - this.bossHalfW - h.x,
      roarCd: this.roarCd,
      roarMax: c.boss.roarCooldown,
      selected: this.selected,
      time: Math.max(0, this.t - INTRO_TIME),
      started: this.started,
      combo: this.combo,
      trapsPlaced: this.tm.placed,
    };
    bus.emit("hud", st);
  }

  // ---------------- 프레임 업데이트 ----------------
  update(_time: number, deltaMs: number) {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const cam = this.cameras.main;
    this.t += dt;
    this.fx.update(dt);

    if (!this.started && !this.ended) {
      this.introT += dt;
      if (this.introT >= INTRO_TIME) {
        this.started = true;
        this.fx.banner(W / 2, 250, "달려라, 마왕!", "#ff9a3d", 64, 1000);
        sfx.go();
      }
    }

    const active = this.started && !this.ended;
    const boss = this.cfg.boss;

    if (!this.ended) {
      if (active) {
        this.bossX += boss.speed * dt;
        this.mana = Math.min(boss.maxMana, this.mana + boss.manaRegen * dt);
        this.roarCd = Math.max(0, this.roarCd - dt);
      }
      this.hero.update(dt, this.tm, this.bossX, active);
      this.tm.update(dt, this.hero, cam.scrollX);

      if (active && this.hero.alive && this.hero.contactCd <= 0 && this.hero.x + HERO_HALF_W >= this.bossX - this.bossHalfW) {
        this.bossHit();
      }
      if (!this.ended && !this.hero.alive) this.finish("hero-defeated");
      else if (!this.ended && this.bossX >= this.exitX) {
        this.bossX = this.exitX;
        this.finish("exit-reached");
      }
    } else if (!this.hero.alive) {
      // 용사 사망 연출 유지
      this.hero.update(dt, this.tm, this.bossX, false);
    }

    // 보스/카메라
    this.bossView.container.x = this.bossX;
    this.bossView.update(dt, active ? boss.speed : 0);
    this.bossShadow.setPosition(this.bossX - 6, GROUND_Y + 4);
    cam.scrollX = this.bossX - BOSS_SCREEN_X;

    this.updateBackground(cam.scrollX);
    this.drawZone();
    this.drawHeroBar();
    this.ambient(dt, cam.scrollX, active);

    this.hudT += dt;
    if (this.hudT > 0.08) {
      this.hudT = 0;
      this.emitHud();
    }
  }

  private updateBackground(scrollX: number) {
    if (this.bgImgs.length) {
      const period = W * 2;
      const x0 = -((scrollX * 0.12) % period);
      this.bgImgs.forEach((img, i) => img.setX(Math.round(x0 + i * W)));
    }
    this.pillars.tilePositionX = scrollX * 0.45;
    this.ground.tilePositionX = scrollX;
  }

  private drawZone() {
    const g = this.zoneG;
    g.clear();
    this.ghostIcon.setVisible(false);
    if (this.ended) return;
    const [minX, maxX] = this.zone();
    const c0 = Math.ceil(minX / CELL);
    const c1 = Math.floor(maxX / CELL);
    if (c1 > c0) {
      g.fillStyle(0x6cff9a, 0.06);
      g.fillRect(c0 * CELL, GROUND_Y - 56, (c1 - c0) * CELL, 56);
      g.lineStyle(1, 0xbfffd0, 0.16);
      for (let c = c0; c <= c1; c++) g.lineBetween(c * CELL, GROUND_Y - 56, c * CELL, GROUND_Y + 2);
      g.lineStyle(2, 0xbfffd0, 0.3);
      g.lineBetween(c0 * CELL, GROUND_Y - 56, c1 * CELL, GROUND_Y - 56);
    }
    if (this.hasPointer) {
      const p = this.input.activePointer;
      const cam = this.cameras.main;
      const cell = this.tm.cellAt(p.x + cam.scrollX);
      const chk = this.tm.canPlace(this.selected, cell, minX, maxX);
      const afford = this.mana >= this.cfg.traps[this.selected].cost;
      const ok = chk === "ok" && afford;
      const color = ok ? 0x6cff9a : chk === "ok" ? 0xffd34d : 0xff5a5a;
      g.fillStyle(color, 0.28);
      g.fillRect(cell * CELL, GROUND_Y - 56, CELL, 56);
      g.lineStyle(2, color, 0.95);
      g.strokeRect(cell * CELL, GROUND_Y - 56, CELL, 56);
      this.ghostIcon
        .setText(TRAP_DEFS[this.selected].icon)
        .setPosition(cell * CELL + CELL / 2, GROUND_Y - 78)
        .setAlpha(ok ? 1 : 0.45)
        .setVisible(true);
    }
  }

  private drawHeroBar() {
    const g = this.heroBar;
    g.clear();
    const h = this.hero;
    if (!h.alive) return;
    const w = 60;
    const x = h.x - w / 2;
    const y = h.y - HERO_H - 30;
    const pct = h.health / h.maxHealth;
    g.fillStyle(0x1b1020, 0.9);
    g.fillRoundedRect(x - 2, y - 2, w + 4, 10, 4);
    g.fillStyle(pct > 0.5 ? 0x4ade80 : pct > 0.25 ? 0xfacc15 : 0xef4444, 1);
    g.fillRoundedRect(x, y, w * pct, 6, 3);
  }

  private ambient(dt: number, scrollX: number, active: boolean) {
    const slow = this.fx.lowFx ? 2 : 1; // 저사양: 상시 이펙트 빈도 절반
    this.emberT += dt;
    if (this.emberT > 0.1 * slow) {
      this.emberT = 0;
      this.fx.burst(scrollX + Math.random() * (W + 200), GROUND_Y - 60 - Math.random() * 380, 1, {
        colors: [0xffb02e, 0xff6a3d, 0xffe28a],
        speed: 20,
        life: 2.2,
        gravity: -25,
        size: 0.22,
        up: 40,
      });
    }
    this.dustT += dt;
    if (active && this.dustT > 0.09 * slow) {
      this.dustT = 0;
      this.fx.burst(this.bossX - this.bossHalfW, GROUND_Y - 2, 1, {
        colors: [0xb59aa8, 0x8a6a7a],
        speed: 70,
        life: 0.4,
        gravity: -40,
        size: 0.5 * this.cfg.boss.scale,
        additive: false,
      });
      if (this.hero.alive && this.hero.onGround && this.hero.speed > 30) {
        this.fx.burst(this.hero.x - 10, GROUND_Y - 2, 1, {
          colors: [0xb59aa8],
          speed: 40,
          life: 0.3,
          gravity: -20,
          size: 0.25,
          additive: false,
        });
      }
    }
  }
}
