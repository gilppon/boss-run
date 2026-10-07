import Phaser from "phaser";
import { BossView } from "./characters";
import { HERO_CHARACTERS } from "./config";
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
import { HeroAIController, type DamageSource } from "./HeroAIController";
import { MUSIC_STEP_SECONDS, sfx, setMusicIntensity, setMusicPaused } from "./sfx";
import { createTextures } from "./textures";
import { TrapManager } from "./TrapManager";
import type { EndReason, HudState, RunConfig, RunResult, TrapType } from "./types";

const COMBO_MANA_REFUNDS: Readonly<Record<number, number>> = { 2: 6, 4: 8, 6: 10, 8: 12 };
const TRAP_MIX_MANA_BONUS = 5;
const SEWER_SURGE_INTERVAL = 10;
const SEWER_SURGE_WARNING = 1.3;
const SEWER_SURGE_DURATION = 1.35;
const SEWER_SURGE_SPEED = 1.24;
const FORGE_DROP_INTERVAL = 11;
const FORGE_DROP_WARNING = 1.4;
const FORGE_STAGGER_DURATION = 0.62;
const FORGE_HIT_RADIUS = 68;
const ABYSS_ECHO_INTERVAL = 12;
const ABYSS_ECHO_WARNING = 1.5;
const ABYSS_ECHO_DURATION = 2.8;
const ABYSS_LANDING_CELLS = 3;
const BASE_COMBO_WINDOW = 3.5;
const CATHEDRAL_BELL_INTERVAL = MUSIC_STEP_SECONDS * 64;
const CATHEDRAL_BELL_WARNING = MUSIC_STEP_SECONDS * 8;
const CATHEDRAL_RESONANCE_DURATION = MUSIC_STEP_SECONDS * 16;

export interface SceneInit {
  config: RunConfig;
  backdrop: HTMLImageElement | null;
}

/**
 * Main scene for the reverse runner.
 * The player IS the demon (boss): they run forward while installing traps
 * instantly on the path of the hero chasing from behind. The world scrolls
 * relative to the boss.
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
  private forecastLabel!: Phaser.GameObjects.Text;
  private sewerNotice: Phaser.GameObjects.Text | null = null;
  private forgeNotice: Phaser.GameObjects.Text | null = null;
  private forgeMarker: Phaser.GameObjects.Graphics | null = null;
  private abyssNotice: Phaser.GameObjects.Text | null = null;
  private abyssMarker: Phaser.GameObjects.Graphics | null = null;
  private cathedralNotice: Phaser.GameObjects.Text | null = null;
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
  private comboTrapTypes = new Set<TrapType>();
  private lastHit = -10;
  private sewerSurgeClock = 0;
  private sewerSurgeActiveT = 0;
  private forgeClock = 0;
  private forgeImpactT = 0;
  private forgeTargetX = 0;
  private forgeWarning = false;
  private forgeDropInFlight = false;
  private forgeImpactHit = false;
  private abyssClock = 0;
  private abyssActiveT = 0;
  private abyssResultT = 0;
  private abyssWarning = false;
  private abyssEchoCell = 0;
  private abyssSerial = 0;
  private cathedralBellClock = 0;
  private cathedralResonanceT = 0;
  private cathedralBellWarning = false;
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
    this.comboTrapTypes.clear();
    this.lastHit = -10;
    this.sewerSurgeClock = 0;
    this.sewerSurgeActiveT = 0;
    this.sewerNotice = null;
    this.forgeClock = 0;
    this.forgeImpactT = 0;
    this.forgeTargetX = 0;
    this.forgeWarning = false;
    this.forgeDropInFlight = false;
    this.forgeImpactHit = false;
    this.forgeNotice = null;
    this.forgeMarker = null;
    this.abyssNotice = null;
    this.abyssMarker = null;
    this.abyssClock = 0;
    this.abyssActiveT = 0;
    this.abyssResultT = 0;
    this.abyssWarning = false;
    this.abyssEchoCell = 0;
    this.abyssSerial = 0;
    this.cathedralBellClock = 0;
    this.cathedralResonanceT = 0;
    this.cathedralBellWarning = false;
    this.cathedralNotice = null;
    this.bossHalfW = 60 * data.config.boss.scale;
  }

  create() {
    const cam = this.cameras.main;
    cam.setBackgroundColor("#12060d");
    createTextures(this);

    // ----- background (mirrored repeat for a seamless parallax) -----
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

    // ----- ground -----
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W + 96, 170, "ground")
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1);

    // ----- exit gate -----
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

    // ----- fx / traps / characters -----
    this.fx = new Fx(this);
    this.tm = new TrapManager(this, this.cfg, this.fx);

    this.zoneG = this.add.graphics().setDepth(4);
    this.ghostIcon = this.add.text(0, 0, "", { fontFamily: FONT, fontSize: "28px" }).setOrigin(0.5).setDepth(15).setVisible(false);
    this.forecastLabel = this.add.text(0, 0, "", {
      fontFamily: FONT,
      fontSize: "12px",
      color: "#fff4d6",
      backgroundColor: "#211521dd",
      padding: { x: 7, y: 4 },
    }).setOrigin(0.5).setDepth(15).setVisible(false);
    if (this.cfg.floorIndex === 1) {
      this.sewerNotice = this.add.text(W / 2, 170, "", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#b7fff2",
        backgroundColor: "#062b35e8",
        padding: { x: 12, y: 8 },
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(65).setVisible(false);
    }
    if (this.cfg.floorIndex === 2) {
      this.forgeNotice = this.add.text(W / 2, 170, "", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ffe2b8",
        backgroundColor: "#35170de8",
        padding: { x: 12, y: 8 },
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(65).setVisible(false);
      this.forgeMarker = this.add.graphics().setDepth(5);
    }
    if (this.cfg.floorIndex === 3) {
      this.abyssNotice = this.add.text(W / 2, 170, "", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#ead6ff",
        backgroundColor: "#211536ee",
        padding: { x: 12, y: 8 },
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(65).setVisible(false);
      this.abyssMarker = this.add.graphics().setDepth(6);
    }
    if (this.cfg.floorIndex === 4) {
      this.cathedralNotice = this.add.text(W / 2, 170, "", {
        fontFamily: FONT,
        fontSize: "17px",
        fontStyle: "bold",
        color: "#fff0b5",
        backgroundColor: "#33230fe8",
        padding: { x: 12, y: 8 },
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(65).setVisible(false);
    }

    this.bossShadow = this.add.image(this.bossX, GROUND_Y + 4, "shadow").setDepth(9);
    this.bossShadow.setScale(this.cfg.boss.scale * 1.6, this.cfg.boss.scale * 1.1);
    this.bossView = new BossView(this, this.cfg.boss.def);
    this.bossView.container.setDepth(11);
    this.bossView.setBaseY(GROUND_Y);
    this.bossView.container.setPosition(this.bossX, GROUND_Y);

    this.hero = new HeroAIController(this, this.cfg.floor, HERO_CHARACTERS[this.cfg.floor.heroId], this.bossX - START_GAP, this.fx, this.cfg.heroHpScale ?? 1);
    this.hero.onDamage = (amount, source, x, y) => this.onHeroDamaged(amount, source, x, y);
    this.hero.onAbyssEchoJump = () => {
      this.abyssResultT = 1.15;
      const landingX = (this.abyssEchoCell + ABYSS_LANDING_CELLS) * CELL + CELL / 2;
      this.fx.text(landingX, GROUND_Y - 92, "ECHO BAIT!", "#dfb7ff", 25);
      this.fx.ring(landingX, GROUND_Y - 14, 0xc58cff, 10);
      sfx.abyssSnap();
    };
    this.heroBar = this.add.graphics().setDepth(40);

    this.add.image(W / 2, H / 2, "vignette").setScrollFactor(0).setDepth(30);

    // ----- input -----
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

    this.fx.banner(W / 2, 250, "READY!", "#ffe14d", 80, 1100);
    this.emitHud();
    bus.emit("ready");
  }

  private cleanup() {
    if (this.cleaned) return;
    this.cleaned = true;
    this.offs.forEach((f) => f());
    this.offs = [];
  }

  // ---------------- input logic ----------------
  private select(t: TrapType) {
    if (!this.cfg.traps[t].unlocked) return;
    this.selected = t;
    sfx.click();
    this.emitHud();
  }

  private setPaused(v: boolean) {
    this.paused = v;
    setMusicPaused(v);
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
      // interpolate so a fast drag never skips cells
      const step = cell >= this.lastPaintCell ? 1 : -1;
      for (let c = this.lastPaintCell + step; step > 0 ? c <= cell : c >= cell; c += step) {
        if (!this.placeCell(c, false)) break;
      }
    }
    this.lastPaintCell = cell;
  }

  /** Returns: whether placement may continue (false when out of mana) */
  private placeCell(cell: number, fromClick: boolean): boolean {
    const [minX, maxX] = this.zone();
    const chk = this.tm.canPlace(this.selected, cell, minX, maxX);
    const cx = cell * CELL + CELL / 2;
    if (chk === "ok") {
      const cost = this.cfg.traps[this.selected].cost;
      if (this.mana < cost) {
        this.deny(cx, "No mana!");
        return false;
      }
      this.mana -= cost;
      this.tm.place(this.selected, cell);
      sfx.place();
      return true;
    }
    if (fromClick && chk === "zone") this.deny(cx, "Place ahead of the hero!");
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
    if (this.cfg.mode === "no-roar-trial" || !this.started || this.ended || this.paused || this.roarCd > 0) return;
    this.roarCd = this.cfg.boss.roarCooldown;
    const power = this.cfg.boss.roarPower;
    sfx.roar();
    this.bossView.roar();
    this.cameras.main.shake(320, 0.012);
    this.fx.ring(this.bossX - 20, GROUND_Y - 100, 0xff6a3d, 16 * power);
    this.fx.ring(this.bossX - 20, GROUND_Y - 100, 0xffe28a, 10 * power);
    this.fx.burst(this.bossX - 40, GROUND_Y - 60, 26, { colors: [0xffe28a, 0xff6a3d], speed: 420, life: 0.6, gravity: 0, size: 0.5, spreadX: 1.4 });
    this.fx.text(this.bossX - 40, GROUND_Y - 230 * this.cfg.boss.scale, "ROAR!", "#ffb02e", 34);
    if (this.hero.alive) {
      this.hero.knockback(1000 * Math.sqrt(power));
      this.hero.roarT = 2.5;
      this.hero.applyStun(0.25);
    }
    this.emitHud();
  }

  // ---------------- combat events ----------------
  private onHeroDamaged(amount: number, source: DamageSource, x: number, y: number) {
    this.trapHits++;
    this.fx.text(x, y - 18, `-${Math.round(amount)}`, "#ff5a5a", 28 + Math.min(amount / 3, 16));
    this.cameras.main.shake(110, 0.004);
    if (this.t - this.lastHit < this.comboWindow()) this.combo++;
    else {
      this.combo = 1;
      this.comboTrapTypes.clear();
    }
    this.lastHit = this.t;
    const trapType: TrapType = source === "lava" ? "Lava" : source === "spike" ? "Spike" : "Minion";
    if (!this.comboTrapTypes.has(trapType)) {
      const isNewType = this.comboTrapTypes.size > 0;
      this.comboTrapTypes.add(trapType);
      if (isNewType) {
        const gained = Math.min(TRAP_MIX_MANA_BONUS, this.cfg.boss.maxMana - this.mana);
        if (gained > 0) {
          this.mana += gained;
          this.fx.text(x, y - 78, `+${gained} MIX MANA`, "#8ef4ff", 20);
        }
      }
    }
    if (this.cathedralResonanceT > 0) {
      this.fx.text(x, y - 74, "CHOIR RESONANCE", "#ffe9a6", 20);
      this.fx.ring(x, y - 10, 0xffdf83, 7);
      sfx.cathedralResonance();
    }
    const refund = COMBO_MANA_REFUNDS[this.combo];
    if (refund !== undefined) {
      sfx.combo(this.combo);
      const gained = Math.min(refund, this.cfg.boss.maxMana - this.mana);
      if (gained > 0) {
        this.mana += gained;
        this.fx.text(x, y - 54, `+${gained} MANA`, "#8ef4ff", 22);
      }
    }
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

  private comboWindow(): number {
    return BASE_COMBO_WINDOW + (this.cfg.floorIndex === 4 && this.cathedralResonanceT > 0 ? CATHEDRAL_RESONANCE_DURATION : 0);
  }

  private finish(reason: EndReason) {
    if (this.ended) return;
    this.ended = true;
    this.dragging = false;
    this.sewerNotice?.setVisible(false);
    this.forgeNotice?.setVisible(false);
    this.forgeMarker?.clear();
    this.abyssNotice?.setVisible(false);
    this.abyssMarker?.clear();
    this.cathedralNotice?.setVisible(false);
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
      this.fx.banner(W / 2, 260, "HERO DOWN!", "#ffe14d", 84, 1600);
      this.bossView.roar();
      this.cameras.main.flash(300, 255, 220, 120);
    } else {
      sfx.lose();
      const msg = reason === "boss-defeated" ? "DEMON DOWN..." : "ESCAPE FAILED!";
      this.fx.banner(W / 2, 260, msg, "#ff6b6b", 72, 1600);
    }
    this.emitHud();
    this.time.delayedCall(won ? 1900 : 1500, () => bus.emit("end", result));
  }

  // ---------------- HUD ----------------
  private emitHud() {
    const c = this.cfg;
    const h = this.hero;
    if (this.t - this.lastHit > this.comboWindow()) {
      this.combo = 0;
      this.comboTrapTypes.clear();
    }
    const st: HudState = {
      bossHp: this.bossHp,
      bossMaxHp: c.boss.maxHp,
      heroHp: h.health,
      heroMaxHp: h.maxHealth,
      heroName: HERO_CHARACTERS[c.floor.heroId].name,
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
      comboVariety: this.comboTrapTypes.size,
      trapsPlaced: this.tm.placed,
    };
    bus.emit("hud", st);
  }

  // ---------------- frame update ----------------
  update(_time: number, deltaMs: number) {
    if (this.paused) return;
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    const cam = this.cameras.main;
    // Keep the run clock frozen while delayed result UI and death effects finish.
    if (!this.ended) this.t += dt;
    this.fx.update(dt);

    if (!this.started && !this.ended) {
      this.introT += dt;
      if (this.introT >= INTRO_TIME) {
        this.started = true;
        this.fx.banner(W / 2, 250, "RUN, DEMON!", "#ff9a3d", 64, 1000);
        sfx.go();
      }
    }

    const active = this.started && !this.ended;
    const boss = this.cfg.boss;

    const progress = Phaser.Math.Clamp((this.bossX - this.startX) / this.cfg.floor.length, 0, 1);
    const gap = this.bossX - this.bossHalfW - this.hero.x;
    const chasePressure = Phaser.Math.Clamp((260 - gap) / 260, 0, 1);
    const healthPressure = 1 - Phaser.Math.Clamp(this.hero.health / this.hero.maxHealth, 0, 1);
    const comboPressure = Phaser.Math.Clamp(this.combo / 8, 0, 1) * 0.82;
    setMusicIntensity(active ? Math.max(progress * 0.42, chasePressure * 0.82, healthPressure * 0.55, comboPressure) : 0.08);

    if (!this.ended) {
      if (active) {
        this.updateSewerSurge(dt);
        this.updateForgeDrop(dt);
        this.updateAbyssEcho(dt);
        this.updateCathedralBell(dt);
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
      // keep the hero death animation playing
      this.hero.update(dt, this.tm, this.bossX, false);
    }

    // boss / camera
    this.bossView.container.x = this.bossX;
    this.bossView.update(dt, active ? boss.speed : 0);
    this.bossShadow.setPosition(this.bossX - 6, GROUND_Y + 4);
    cam.scrollX = this.bossX - BOSS_SCREEN_X;

    this.updateBackground(cam.scrollX);
    this.drawForgeMarker();
    this.drawAbyssMarker();
    this.drawZone();
    this.drawHeroBar();
    this.ambient(dt, cam.scrollX, active);

    this.hudT += dt;
    if (this.hudT > 0.08) {
      this.hudT = 0;
      this.emitHud();
    }
  }

  private updateSewerSurge(dt: number) {
    if (this.cfg.floorIndex !== 1 || !this.sewerNotice) return;
    if (!this.hero.alive) {
      this.sewerNotice.setVisible(false);
      return;
    }
    this.sewerSurgeClock += dt;
    this.sewerSurgeActiveT = Math.max(0, this.sewerSurgeActiveT - dt);

    if (this.sewerSurgeClock >= SEWER_SURGE_INTERVAL) {
      this.sewerSurgeClock -= SEWER_SURGE_INTERVAL;
      this.sewerSurgeActiveT = SEWER_SURGE_DURATION;
      this.hero.applyTidalRush(SEWER_SURGE_SPEED, SEWER_SURGE_DURATION);
      const waveX = this.hero.x - 54;
      this.fx.ring(waveX, GROUND_Y - 66, 0x64f4df, 11);
      this.fx.burst(waveX, GROUND_Y - 10, 22, {
        colors: [0x8dfff0, 0x4ec6ff, 0xc6fff8],
        speed: 270,
        life: 0.55,
        up: 110,
        gravity: 180,
        size: 0.42,
        spreadX: 1.8,
      });
      sfx.tidalSurge();
    }

    if (this.sewerSurgeActiveT > 0) {
      this.sewerNotice.setText("TIDAL SURGE · HERO RUSHING — PLACE TRAPS OR ROAR");
      this.sewerNotice.setAlpha(0.88 + Math.sin(this.t * 18) * 0.12).setVisible(true);
      return;
    }

    const untilSurge = SEWER_SURGE_INTERVAL - this.sewerSurgeClock;
    if (untilSurge <= SEWER_SURGE_WARNING) {
      this.sewerNotice.setText(`TIDAL SURGE IN ${untilSurge.toFixed(1)}s · PREPARE`);
      this.sewerNotice.setAlpha(0.82 + Math.sin(this.t * 14) * 0.18).setVisible(true);
    } else {
      this.sewerNotice.setVisible(false);
    }
  }

  private updateForgeDrop(dt: number) {
    if (this.cfg.floorIndex !== 2 || !this.forgeNotice || !this.forgeMarker) return;
    if (!this.hero.alive) {
      this.forgeNotice.setVisible(false);
      this.forgeMarker.clear();
      return;
    }

    this.forgeClock += dt;
    this.forgeImpactT = Math.max(0, this.forgeImpactT - dt);

    if (this.forgeClock >= FORGE_DROP_INTERVAL) {
      this.forgeClock -= FORGE_DROP_INTERVAL;
      this.forgeWarning = false;
      this.forgeDropInFlight = true;
      this.forgeImpactT = 0.72;
      this.dropForgeSteel();
    } else if (this.forgeClock >= FORGE_DROP_INTERVAL - FORGE_DROP_WARNING && !this.forgeWarning) {
      this.forgeWarning = true;
      const forecastSpeed = Math.max(this.hero.speed, this.cfg.floor.heroSpeed * 0.55);
      this.forgeTargetX = this.hero.x + forecastSpeed * FORGE_DROP_WARNING;
    }

    if (this.forgeDropInFlight) {
      this.forgeNotice.setText("STEEL IMPACT!");
      this.forgeNotice.setAlpha(0.96).setVisible(true);
    } else if (this.forgeImpactT > 0) {
      this.forgeNotice.setText(this.forgeImpactHit ? "FORGE DROP · HERO STAGGERED" : "FORGE DROP · MISSED");
      this.forgeNotice.setAlpha(0.9).setVisible(true);
    } else if (this.forgeWarning) {
      const untilDrop = FORGE_DROP_INTERVAL - this.forgeClock;
      this.forgeNotice.setText(`STEEL DROP IN ${untilDrop.toFixed(1)}s · AIM FOR THE MARK`);
      this.forgeNotice.setAlpha(0.82 + Math.sin(this.t * 14) * 0.18).setVisible(true);
    } else {
      this.forgeNotice.setVisible(false);
    }
  }

  private updateAbyssEcho(dt: number) {
    if (this.cfg.floorIndex !== 3 || !this.abyssNotice || !this.abyssMarker) return;
    if (!this.hero.alive) {
      this.abyssNotice.setVisible(false);
      this.abyssMarker.clear();
      return;
    }

    this.abyssClock += dt;
    this.abyssActiveT = Math.max(0, this.abyssActiveT - dt);
    this.abyssResultT = Math.max(0, this.abyssResultT - dt);
    if (this.abyssClock >= ABYSS_ECHO_INTERVAL) {
      this.abyssClock -= ABYSS_ECHO_INTERVAL;
      this.abyssWarning = false;
      this.abyssActiveT = ABYSS_ECHO_DURATION;
      this.hero.applyAbyssEcho(this.abyssEchoCell, ABYSS_ECHO_DURATION, ++this.abyssSerial);
      sfx.abyssEcho();
    } else if (this.abyssClock >= ABYSS_ECHO_INTERVAL - ABYSS_ECHO_WARNING && !this.abyssWarning) {
      this.abyssWarning = true;
      const speed = Math.max(this.hero.speed, this.cfg.floor.heroSpeed * 0.55);
      this.abyssEchoCell = Math.ceil((this.hero.x + speed * ABYSS_ECHO_WARNING + CELL * 2) / CELL);
    }

    if (this.abyssClock >= ABYSS_ECHO_INTERVAL - ABYSS_ECHO_WARNING) {
      const untilEcho = ABYSS_ECHO_INTERVAL - this.abyssClock;
      this.abyssNotice.setText(`ABYSS ECHO IN ${untilEcho.toFixed(1)}s · PREPARE A LANDING TRAP`);
      this.abyssNotice.setAlpha(0.84 + Math.sin(this.t * 14) * 0.16).setVisible(true);
    } else if (this.abyssResultT > 0) {
      this.abyssNotice.setText("ECHO BAIT · TRAP HIS LANDING");
      this.abyssNotice.setAlpha(0.9).setVisible(true);
    } else if (this.abyssActiveT > 0) {
      this.abyssNotice.setText("ABYSS ECHO · BAIT THE JUMP");
      this.abyssNotice.setAlpha(0.9).setVisible(true);
    } else {
      this.abyssNotice.setVisible(false);
    }
  }

  private drawAbyssMarker() {
    const g = this.abyssMarker;
    if (!g) return;
    g.clear();
    if ((!this.abyssWarning && this.abyssActiveT <= 0) || this.ended) return;
    const hazardX = this.abyssEchoCell * CELL + CELL / 2;
    const landingX = (this.abyssEchoCell + ABYSS_LANDING_CELLS) * CELL + CELL / 2;
    const pulse = 0.48 + (Math.sin(this.t * 13) + 1) * 0.2;
    g.fillStyle(0x9b62e8, 0.2);
    g.fillCircle(hazardX, GROUND_Y - 2, 19 + Math.sin(this.t * 9) * 3);
    g.lineStyle(3, 0xc891ff, pulse);
    g.strokeCircle(hazardX, GROUND_Y - 2, 27);
    g.lineStyle(2, 0xc891ff, pulse * 0.72);
    g.lineBetween(hazardX - 10, GROUND_Y - 2, hazardX + 10, GROUND_Y - 2);
    g.lineBetween(hazardX, GROUND_Y - 12, hazardX, GROUND_Y + 8);
    g.fillStyle(0x75e5d4, pulse * 0.9);
    g.fillRect(landingX - CELL / 2, GROUND_Y - 7, CELL, 7);
    g.lineStyle(2, 0x75e5d4, pulse);
    g.strokeRect(landingX - CELL / 2, GROUND_Y - 48, CELL, 41);
  }

  private updateCathedralBell(dt: number) {
    if (this.cfg.floorIndex !== 4 || !this.cathedralNotice) return;
    this.cathedralBellClock += dt;
    this.cathedralResonanceT = Math.max(0, this.cathedralResonanceT - dt);

    if (this.cathedralBellClock >= CATHEDRAL_BELL_INTERVAL) {
      this.cathedralBellClock -= CATHEDRAL_BELL_INTERVAL;
      this.cathedralBellWarning = false;
      this.cathedralResonanceT = CATHEDRAL_RESONANCE_DURATION;
      const bellX = this.hero.x + 60;
      this.fx.ring(bellX, GROUND_Y - 90, 0xffdf83, 12);
      this.fx.ring(bellX, GROUND_Y - 90, 0xfff3bd, 7);
      this.fx.burst(bellX, GROUND_Y - 32, 12, {
        colors: [0xfff0b5, 0xffcf68, 0xd7b4ff],
        speed: 120,
        life: 0.72,
        up: 90,
        gravity: 80,
        size: 0.32,
        spreadX: 1.4,
      });
      sfx.cathedralBell();
    } else if (this.cathedralBellClock >= CATHEDRAL_BELL_INTERVAL - CATHEDRAL_BELL_WARNING && !this.cathedralBellWarning) {
      this.cathedralBellWarning = true;
    }

    if (this.cathedralResonanceT > 0) {
      this.cathedralNotice.setText("CHOIR RESONANCE · COMBO WINDOW +2.2s");
      this.cathedralNotice.setAlpha(0.9 + Math.sin(this.t * 16) * 0.1).setVisible(true);
    } else if (this.cathedralBellWarning) {
      const untilBell = CATHEDRAL_BELL_INTERVAL - this.cathedralBellClock;
      this.cathedralNotice.setText(`CATHEDRAL BELL IN ${untilBell.toFixed(1)}s · READY YOUR NEXT TRAP`);
      this.cathedralNotice.setAlpha(0.82 + Math.sin(this.t * 14) * 0.18).setVisible(true);
    } else {
      this.cathedralNotice.setVisible(false);
    }
  }

  private drawForgeMarker() {
    const g = this.forgeMarker;
    if (!g) return;
    g.clear();
    if (!this.forgeWarning || this.ended) return;
    const x = this.forgeTargetX;
    const pulse = 0.45 + (Math.sin(this.t * 15) + 1) * 0.18;
    g.fillStyle(0xff7a31, 0.15);
    g.fillRect(x - CELL / 2, GROUND_Y - 10, CELL, 10);
    g.lineStyle(3, 0xffa04a, pulse);
    g.strokeRect(x - CELL / 2, GROUND_Y - 70, CELL, 62);
    g.lineStyle(2, 0xffa04a, pulse * 0.45);
    g.lineBetween(x, GROUND_Y - 220, x, GROUND_Y - 78);
    g.fillStyle(0xffa04a, pulse);
    g.fillTriangle(x, GROUND_Y - 228, x - 9, GROUND_Y - 244, x + 9, GROUND_Y - 244);
  }

  private dropForgeSteel() {
    const x = this.forgeTargetX;
    this.forgeImpactHit = false;

    const plate = this.add.rectangle(x, GROUND_Y - 270, CELL * 1.55, 28, 0x8795a2).setDepth(12);
    plate.setStrokeStyle(3, 0xffa04a, 1);
    const hotCore = this.add.rectangle(x, GROUND_Y - 270, CELL * 0.7, 6, 0xffc36b).setDepth(13);
    this.tweens.add({
      targets: [plate, hotCore],
      y: GROUND_Y - 14,
      duration: 190,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.forgeImpactHit = this.hero.alive && this.hero.onGround && Math.abs(this.hero.x - x) <= FORGE_HIT_RADIUS;
        this.forgeDropInFlight = false;
        if (this.forgeImpactHit) {
          this.hero.applyStun(FORGE_STAGGER_DURATION);
          this.fx.text(x, GROUND_Y - 104, "STAGGERED!", "#ffd08a", 24);
        }
        this.fx.ring(x, GROUND_Y - 18, this.forgeImpactHit ? 0xffb14e : 0x9ba9b5, this.forgeImpactHit ? 14 : 9);
        this.fx.burst(x, GROUND_Y - 12, this.forgeImpactHit ? 24 : 14, {
          colors: this.forgeImpactHit ? [0xffe7a0, 0xff9a3d, 0xe2e8f0] : [0xd5e0e8, 0x8795a2],
          speed: this.forgeImpactHit ? 330 : 230,
          life: 0.5,
          up: 170,
          gravity: 420,
          size: 0.42,
        });
        this.time.delayedCall(390, () => {
          plate.destroy();
          hotCore.destroy();
        });
        sfx.forgeImpact(this.forgeImpactHit);
      },
    });
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
    this.forecastLabel.setVisible(false);
    if (this.ended) return;
    const [minX, maxX] = this.zone();
    const c0 = Math.ceil(minX / CELL);
    const c1 = Math.floor(maxX / CELL);
    if (c1 > c0) {
      g.fillStyle(0x6cff9a, 0.06);
      g.fillRect(c0 * CELL, GROUND_Y - 56, (c1 - c0) * CELL, 56);
      for (let c = c0; c <= c1; c++) {
        if (!this.tm.isRuneCell(c)) continue;
        const runeX = c * CELL + CELL / 2;
        g.fillStyle(0xffd166, 0.22);
        g.fillCircle(runeX, GROUND_Y - 10, 13);
        g.lineStyle(2, 0xffd166, 0.92);
        g.strokeCircle(runeX, GROUND_Y - 10, 8);
        g.lineBetween(runeX - 4, GROUND_Y - 10, runeX + 4, GROUND_Y - 10);
        g.lineBetween(runeX, GROUND_Y - 14, runeX, GROUND_Y - 6);
      }
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
      if (ok) {
        const forecast = this.hero.previewTrap(this.selected, cell, this.cfg.traps[this.selected], this.tm);
        const baseDamage = this.cfg.traps[this.selected].damage;
        const boostedDamage = this.tm.placementStats(this.selected, cell).damage;
        const eruptionHint = this.selected === "Lava" ? " · CATCHES LOW JUMPS" : "";
        const runeHint = this.tm.isRuneCell(cell) ? `RUNE ${baseDamage}→${boostedDamage} DMG${eruptionHint} · ` : "";
        this.forecastLabel.setText(`${runeHint}${forecast}`).setPosition(cell * CELL + CELL / 2, GROUND_Y - 112).setVisible(true);
      }
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
    const slow = this.fx.lowFx ? 2 : 1; // low-spec: halve the ambient fx rate
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
