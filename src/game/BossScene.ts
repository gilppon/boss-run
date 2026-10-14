import Phaser from "phaser";
import { BossView, registerFrameGrid } from "./characters";
import { HERO_CHARACTERS } from "./config";
import {
  BOSS_SCREEN_X,
  CELL,
  GROUND_Y,
  H,
  HERO_HALF_W,
  HERO_H,
  INTRO_TIME,
  MINION_H,
  START_GAP,
  W,
} from "./constants";
import { TRAP_DEFS } from "./config";
import { bus } from "./bus";
import { Fx, FONT } from "./fx";
import { HeroAIController, type DamageSource } from "./HeroAIController";
import { getHeroAttackDodgeAction, type DodgeAction } from "./heroAttack";
import { MUSIC_STEP_SECONDS, sfx, setMusicIntensity, setMusicPaused } from "./sfx";
import { createTextures } from "./textures";
import { TrapManager } from "./TrapManager";
import type { EndReason, HudState, RunConfig, RunResult, TrapType } from "./types";

const COMBO_MANA_REFUNDS: Readonly<Record<number, number>> = { 2: 6, 4: 8, 6: 10, 8: 12 };
const TRAP_MIX_MANA_BONUS = 5;
const SPIKE_PLACEMENT_COOLDOWN = 2.4;
const SPIKE_MIN_PLACEMENT_GAP = 90;
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
const BOSS_JUMP_SPEED = 620;
const BOSS_JUMP_GRAVITY = 1500;
const BOSS_JUMP_COOLDOWN = 1.1;
const BOSS_CROUCH_DURATION = 0.8;
const BOSS_CROUCH_COOLDOWN = 1.25;
const BOSS_CROUCH_HEIGHT = 0.52;
const BOSS_CONTACT_DODGE_HEIGHT = HERO_H + 6;
const JUMP_DODGE_INPUT_GRACE = 0.24;

import type { GameSprites } from "./assets";

export interface SceneInit {
  config: RunConfig;
  backdrop: HTMLImageElement | null;
  sprites?: GameSprites;
}

interface HeroProjectile {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  damage: number;
  type: string;
  alive: boolean;
  color: number;
  radiusX: number;
  radiusY: number;
  enteredBossX: boolean;
}

interface BossProjectile {
  g: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  radius: number;
  damage: number;
  vx: number;
  action: DodgeAction;
  color: number;
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
  private spritesData?: GameSprites;

  private fx!: Fx;
  private tm!: TrapManager;
  private hero!: HeroAIController;
  private heroProjectiles: HeroProjectile[] = [];
  private bossProjectiles: BossProjectile[] = [];
  private nextBossWaveAction: DodgeAction = "jump";
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
  private spikePlaceCd = 0;
  private roarCd = 0;
  private bossJumpHeight = 0;
  private bossJumpVelocity = 0;
  private jumpDodgeGraceT = 0;
  private jumpCd = 0;
  private bossCrouchT = 0;
  private crouchCd = 0;
  private selected: TrapType = "Lava";

  private t = 0;
  private introT = 0;
  private started = false;
  private ended = false;
  private paused = false;
  private tutorialHold = false;
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
    this.spritesData = data.sprites;
    this.bgImgs = [];
    this.offs = [];
    this.cleaned = false;
    this.bossX = BOSS_SCREEN_X;
    this.startX = BOSS_SCREEN_X;
    this.exitX = this.startX + data.config.floor.length;
    this.bossHp = data.config.boss.maxHp;
    this.mana = data.config.boss.maxMana;
    this.spikePlaceCd = 0;
    this.roarCd = 0;
    this.bossJumpHeight = 0;
    this.bossJumpVelocity = 0;
    this.jumpDodgeGraceT = 0;
    this.jumpCd = 0;
    this.bossCrouchT = 0;
    this.crouchCd = 0;
    this.nextBossWaveAction = "jump";
    this.heroProjectiles = [];
    this.bossProjectiles = [];
    this.selected = "Lava";
    this.t = 0;
    this.introT = 0;
    this.started = false;
    this.ended = false;
    this.paused = false;
    this.tutorialHold = data.config.tutorialHold === true;
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

    if (this.spritesData) {
      if (this.spritesData.bossDemon) {
        if (this.textures.exists("boss_demon")) this.textures.remove("boss_demon");
        this.textures.addImage("boss_demon", this.spritesData.bossDemon);
      }
      if (this.spritesData.bossDemonAnimation) {
        registerFrameGrid(this, "boss_demon_anim", this.spritesData.bossDemonAnimation, 4, 3);
      }
      if (this.spritesData.bossHellKing) {
        if (this.textures.exists("boss_hell_king")) this.textures.remove("boss_hell_king");
        this.textures.addImage("boss_hell_king", this.spritesData.bossHellKing);
      }
      if (this.spritesData.bossHellKingAnimation) {
        registerFrameGrid(this, "boss_hell_king_anim", this.spritesData.bossHellKingAnimation, 4, 3);
      }
      if (this.spritesData.bossAbyssLord) {
        if (this.textures.exists("boss_abyss_lord")) this.textures.remove("boss_abyss_lord");
        this.textures.addImage("boss_abyss_lord", this.spritesData.bossAbyssLord);
      }
      if (this.spritesData.bossAbyssLordAnimation) {
        registerFrameGrid(this, "boss_abyss_lord_anim", this.spritesData.bossAbyssLordAnimation, 4, 3);
      }
      if (this.spritesData.bossLastEmperor) {
        if (this.textures.exists("boss_last_emperor")) this.textures.remove("boss_last_emperor");
        this.textures.addImage("boss_last_emperor", this.spritesData.bossLastEmperor);
      }
      if (this.spritesData.bossLastEmperorAnimation) {
        registerFrameGrid(this, "boss_last_emperor_anim", this.spritesData.bossLastEmperorAnimation, 4, 3);
      }
      if (this.spritesData.heroApprentice) {
        if (this.textures.exists("hero_apprentice")) this.textures.remove("hero_apprentice");
        this.textures.addImage("hero_apprentice", this.spritesData.heroApprentice);
      }
      if (this.spritesData.heroApprenticeAnimation) {
        registerFrameGrid(this, "hero_apprentice_anim", this.spritesData.heroApprenticeAnimation, 4, 3);
      }
      if (this.spritesData.heroScout) {
        if (this.textures.exists("hero_scout")) this.textures.remove("hero_scout");
        this.textures.addImage("hero_scout", this.spritesData.heroScout);
      }
      if (this.spritesData.heroScoutAnimation) {
        registerFrameGrid(this, "hero_scout_anim", this.spritesData.heroScoutAnimation, 4, 3);
      }
      if (this.spritesData.heroWarden) {
        if (this.textures.exists("hero_warden")) this.textures.remove("hero_warden");
        this.textures.addImage("hero_warden", this.spritesData.heroWarden);
      }
      if (this.spritesData.heroWardenAnimation) {
        registerFrameGrid(this, "hero_warden_anim", this.spritesData.heroWardenAnimation, 4, 3);
      }
      if (this.spritesData.heroBreaker) {
        if (this.textures.exists("hero_breaker")) this.textures.remove("hero_breaker");
        this.textures.addImage("hero_breaker", this.spritesData.heroBreaker);
      }
      if (this.spritesData.heroBreakerAnimation) {
        registerFrameGrid(this, "hero_breaker_anim", this.spritesData.heroBreakerAnimation, 4, 3);
      }
      if (this.spritesData.heroDuelist) {
        if (this.textures.exists("hero_duelist")) this.textures.remove("hero_duelist");
        this.textures.addImage("hero_duelist", this.spritesData.heroDuelist);
      }
      if (this.spritesData.heroDuelistAnimation) {
        registerFrameGrid(this, "hero_duelist_anim", this.spritesData.heroDuelistAnimation, 4, 3);
      }
      if (this.spritesData.minionImp) {
        if (this.textures.exists("minion_imp")) this.textures.remove("minion_imp");
        this.textures.addImage("minion_imp", this.spritesData.minionImp);
      }
      if (this.spritesData.tileGround) {
        if (this.textures.exists("tile_ground")) this.textures.remove("tile_ground");
        this.textures.addImage("tile_ground", this.spritesData.tileGround);
      }
      if (this.spritesData.pillarsHd) {
        if (this.textures.exists("pillars_hd")) this.textures.remove("pillars_hd");
        this.textures.addImage("pillars_hd", this.spritesData.pillarsHd);
      }
    }

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
    this.add.rectangle(W / 2, H / 2, W, H, 0x12060d, this.backdropImg ? 0.15 : 0.9).setScrollFactor(0).setDepth(-9);

    // ----- midground pillars (HD texture if exists, else fallback canvas pillars) -----
    const pillarsKey = this.textures.exists("pillars_hd") ? "pillars_hd" : "pillars";
    this.pillars = this.add
      .tileSprite(0, 50, W + 400, 540, pillarsKey)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-5)
      .setAlpha(this.textures.exists("pillars_hd") ? 0.92 : 0.75);

    // ----- ground (HD tile_ground if exists, else fallback canvas ground) -----
    const groundKey = this.textures.exists("tile_ground") ? "tile_ground" : "ground";
    this.ground = this.add
      .tileSprite(0, GROUND_Y, W + 96, 180, groundKey)
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
    this.hero.onAttack = (type, x, y, isMelee) => this.handleHeroAttack(type, x, y, isMelee);
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
      kb.on("keydown-ONE", () => this.select("Lava"));
      kb.on("keydown-TWO", () => this.select("Spike"));
      kb.on("keydown-THREE", () => this.select("Minion"));
    }

    this.offs.push(bus.on("select", (t: TrapType) => this.select(t)));
    this.offs.push(bus.on("roar", () => this.castRoar()));
    this.offs.push(bus.on("jump", () => this.jumpBoss()));
    this.offs.push(bus.on("crouch", () => this.crouchBoss()));
    this.offs.push(bus.on("pause", (v: boolean) => this.setPaused(v)));
    this.offs.push(bus.on("tutorial-skip", () => {
      if (this.tutorialHold && !this.ended) this.tutorialHold = false;
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    this.fx.banner(W / 2, 250, "READY!", "#ffe14d", 80, 1100);
    this.emitHud();
    bus.emit("ready");
  }

  private cleanup() {
    if (this.cleaned) return;
    this.cleaned = true;
    for (const p of this.heroProjectiles) {
      p.g.destroy();
    }
    this.heroProjectiles = [];
    for (const p of this.bossProjectiles) p.g.destroy();
    this.bossProjectiles = [];
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
    const minGap = this.selected === "Spike" ? SPIKE_MIN_PLACEMENT_GAP : 30;
    return [this.hero.x + minGap, this.bossX - this.bossHalfW - 24];
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
      if (this.selected === "Spike" && this.spikePlaceCd > 0) {
        this.deny(cx, `Spikes ready in ${this.spikePlaceCd.toFixed(1)}s`);
        return false;
      }
      this.mana -= cost;
      this.tm.place(this.selected, cell);
      if (this.selected === "Spike") this.spikePlaceCd = SPIKE_PLACEMENT_COOLDOWN;
      this.tutorialHold = false;
      this.bossView.summonTrap();
      sfx.place();
      this.emitHud();
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
    const firstAction = this.nextBossWaveAction;
    const followupAction = firstAction === "jump" ? "crouch" : "jump";
    this.spawnBossWave(firstAction);
    this.time.delayedCall(1.15, () => {
      if (!this.ended && this.started && this.hero.alive) this.spawnBossWave(followupAction);
    });
    this.nextBossWaveAction = followupAction;
    // 영웅 투사체 즉시 패링 파괴!
    for (let i = this.heroProjectiles.length - 1; i >= 0; i--) {
      const p = this.heroProjectiles[i];
      if (Math.abs(p.x - this.bossX) < 420) {
        p.alive = false;
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
        this.fx.text(p.x, p.y - 20, "PARRIED! +10 MANA", "#fde047", 26);
        this.fx.burst(p.x, p.y, 16, { colors: [0xffffff, 0xfde047], speed: 280, life: 0.4 });
        this.mana = Math.min(this.cfg.boss.maxMana, this.mana + 10);
      }
    }
    this.emitHud();
  }

  private spawnBossWave(action: DodgeAction) {
    if (!this.hero.alive || this.hero.targetDistance > 760) return;
    const color = action === "jump" ? 0xff813d : 0x50c7ff;
    const radius = 16;
    const x = this.bossX - this.bossHalfW - radius;
    const y = action === "jump" ? GROUND_Y - 24 : GROUND_Y - 56;
    const g = this.add.graphics().setDepth(26);
    g.fillStyle(color, 0.22).fillCircle(0, 0, radius + 8);
    g.lineStyle(5, color, 0.95).strokeCircle(0, 0, radius);
    g.fillStyle(0xfff2ce, 0.95).fillCircle(0, 0, radius * 0.43);
    g.setPosition(x, y);
    this.fx.text(this.bossX - 100, y - 38, action === "jump" ? "GROUND WAVE!" : "SKY WAVE!", action === "jump" ? "#ffbd72" : "#8be4ff", 20);
    this.hero.notifyIncomingBossAttack(action);
    this.bossProjectiles.push({ g, x, y, radius, damage: 16, vx: -480, action, color });
    sfx.fire();
  }

  private jumpBoss() {
    if (!this.started || this.ended || this.paused || this.jumpCd > 0 || this.bossJumpHeight > 0) return;
    this.bossCrouchT = 0;
    this.bossJumpVelocity = BOSS_JUMP_SPEED;
    this.jumpDodgeGraceT = JUMP_DODGE_INPUT_GRACE;
    this.jumpCd = BOSS_JUMP_COOLDOWN;
    this.fx.burst(this.bossX, GROUND_Y - 2, 10, { colors: [0xffd166, 0xffffff], speed: 150, life: 0.35, gravity: 180 });
    this.fx.ring(this.bossX, GROUND_Y - 10, 0xffd166, 8);
    this.emitHud();
  }

  private crouchBoss() {
    if (!this.started || this.ended || this.paused || this.crouchCd > 0 || this.bossJumpHeight > 0) return;
    this.bossCrouchT = BOSS_CROUCH_DURATION;
    this.crouchCd = BOSS_CROUCH_COOLDOWN;
    this.fx.ring(this.bossX, GROUND_Y - 24, 0x67e8f9, 8);
    this.emitHud();
  }

  private updateBossDodge(dt: number) {
    this.jumpCd = Math.max(0, this.jumpCd - dt);
    this.crouchCd = Math.max(0, this.crouchCd - dt);
    this.bossCrouchT = Math.max(0, this.bossCrouchT - dt);
    this.jumpDodgeGraceT = Math.max(0, this.jumpDodgeGraceT - dt);

    if (this.bossJumpHeight > 0 || this.bossJumpVelocity > 0) {
      this.bossJumpHeight += this.bossJumpVelocity * dt;
      this.bossJumpVelocity -= BOSS_JUMP_GRAVITY * dt;
      if (this.bossJumpHeight <= 0 && this.bossJumpVelocity <= 0) {
        this.bossJumpHeight = 0;
        this.bossJumpVelocity = 0;
      }
    }
  }

  private isBossDucking(): boolean {
    return this.bossCrouchT > 0;
  }

  private isBossAvoiding(action: DodgeAction): boolean {
    return action === "jump"
      ? this.bossJumpHeight >= BOSS_CONTACT_DODGE_HEIGHT || this.jumpDodgeGraceT > 0
      : this.isBossDucking();
  }

  private showDodgeSuccess(x: number, y: number, label = "DODGED!") {
    this.fx.text(x, y - 24, label, "#67e8f9", 24);
    this.fx.ring(x, y, 0x67e8f9, 10);
    this.fx.burst(x, y, 8, { colors: [0x67e8f9, 0xffffff], speed: 180, life: 0.3 });
  }

  // ---------------- combat events ----------------
  private onHeroDamaged(amount: number, source: DamageSource, x: number, y: number) {
    if (source === "boss-attack") {
      this.fx.text(x, y - 18, `-${Math.round(amount)}`, "#ff9b50", 28 + Math.min(amount / 3, 16));
      this.fx.burst(x, y, 10, { colors: [0xffe28a, 0xff813d, 0xffffff], speed: 220, life: 0.32 });
      this.cameras.main.shake(90, 0.003);
      return;
    }
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

  private handleHeroAttack(type: string, x: number, y: number, isMelee: boolean) {
    if (this.ended) return;

    if (isMelee) {
      // 💥 영웅의 강력한 근접 참격 공격 (Melee Cleave)
      sfx.fire();
      this.hero.view.launch();
      this.fx.ring(x + 20, y, 0xff3b3b, 14);
      this.fx.burst(x + 30, y, 16, { colors: [0xffffff, 0xff3b3b, 0xffa500], speed: 280, life: 0.35 });
      this.fx.text(x + 10, y - 42, "⚔️ MELEE CLEAVE!", "#ff4444", 26);

      const dmg = 14;
      if (this.isBossAvoiding(getHeroAttackDodgeAction(type, true))) {
        this.showDodgeSuccess(this.bossX - 30, GROUND_Y - 80, "STRIKE DODGED!");
        return;
      }
      this.bossHp = Math.max(0, this.bossHp - dmg);
      this.bossView.flash();
      sfx.bossHurt();
      this.cameras.main.shake(220, 0.015);
      this.fx.text(this.bossX, GROUND_Y - 150 * this.cfg.boss.scale, `-${dmg} HP`, "#ff3b3b", 36);
      this.emitHud();
      if (this.bossHp <= 0) this.finish("boss-defeated");
      return;
    }

    // 🏹 화려한 원거리 스킬 발사!
    this.spawnHeroProjectile(type, x, y);

    // Stage 1 & 2 영웅은 빠른 2연타 연속 발사!
    if (type === "apprentice" || type === "scout") {
      this.time.delayedCall(220, () => {
        if (!this.ended && this.hero.alive && this.hero.targetDistance > 100) {
          this.spawnHeroProjectile(type, this.hero.x + 24, this.hero.y - 36, true);
        }
      });
    }
  }

  private spawnHeroProjectile(type: string, x: number, y: number, isSecond = false) {
    if (this.ended) return;
    const g = this.add.graphics().setDepth(25);
    let vx = 620;
    let damage = 12;
    let color = 0x38bdf8;
    let label = isSecond ? "COMBO SLASH!" : "HOLY SLASH!";
    let textColor = "#38bdf8";

    if (type === "scout") {
      vx = 740;
      damage = 9;
      color = 0x34d399;
      label = isSecond ? "SHADOW DAGGER II!" : "SHADOW DAGGER!";
      textColor = "#34d399";
      // 빛나는 고속 비수 단검
      g.fillStyle(color, 1);
      g.fillTriangle(-18, -6, 22, 0, -18, 6);
      g.fillStyle(0xffffff, 0.9);
      g.fillTriangle(-10, -2, 16, 0, -10, 2);
      g.lineStyle(2, 0x6ee7b7, 0.95);
      g.strokeTriangle(-18, -6, 22, 0, -18, 6);
    } else if (type === "warden") {
      vx = 520;
      damage = 18;
      color = 0xf97316;
      label = "EARTH SHATTER!";
      textColor = "#f97316";
      // 사각형 충격파 대신 전방으로 타오르는 화염 탄환
      g.fillStyle(color, 0.22);
      g.fillEllipse(-2, 0, 62, 42);
      g.fillStyle(0xc2410c, 1);
      g.beginPath();
      g.moveTo(-28, 0);
      g.lineTo(-16, -9);
      g.lineTo(-19, -21);
      g.lineTo(-5, -14);
      g.lineTo(3, -22);
      g.lineTo(9, -12);
      g.lineTo(22, -9);
      g.lineTo(16, 0);
      g.lineTo(29, 0);
      g.lineTo(15, 8);
      g.lineTo(14, 19);
      g.lineTo(3, 12);
      g.lineTo(-5, 21);
      g.lineTo(-10, 12);
      g.lineTo(-21, 14);
      g.lineTo(-16, 4);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xfde047, 0.98);
      g.beginPath();
      g.moveTo(-16, 0);
      g.lineTo(-7, -6);
      g.lineTo(-8, -13);
      g.lineTo(0, -8);
      g.lineTo(7, -15);
      g.lineTo(10, -7);
      g.lineTo(20, -3);
      g.lineTo(12, 2);
      g.lineTo(8, 11);
      g.lineTo(1, 6);
      g.lineTo(-6, 12);
      g.lineTo(-8, 5);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xfffbeb, 0.96);
      g.fillEllipse(7, 0, 13, 9);
    } else if (type === "breaker") {
      vx = 480;
      damage = 20;
      color = 0xa855f7;
      label = "VOID GRAVITY ORB!";
      textColor = "#a855f7";
      // 심연의 보라색 중력 구체
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, 20);
      g.fillStyle(0x38bdf8, 0.85);
      g.fillCircle(0, 0, 10);
      g.lineStyle(3, 0xf0abfc, 0.95);
      g.strokeCircle(0, 0, 20);
    } else if (type === "duelist") {
      vx = 820;
      damage = 22;
      color = 0xfacc15;
      label = "ROYAL PIERCING RAY!";
      textColor = "#facc15";
      // 황금빛 초고속 관통 레이저 빔
      g.fillStyle(color, 1);
      g.fillRoundedRect(-32, -6, 64, 12, 4);
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(-24, -3, 48, 6, 2);
      g.lineStyle(2, 0xfef08a, 0.95);
      g.strokeRoundedRect(-32, -6, 64, 12, 4);
    } else {
      // 견습 용사의 신성 반월 참격파 (Apprentice)
      g.fillStyle(color, 1);
      g.beginPath();
      g.arc(0, 0, 24, -Math.PI / 2, Math.PI / 2);
      g.lineTo(-8, 0);
      g.closePath();
      g.fillPath();
      g.fillStyle(0xffffff, 0.85);
      g.beginPath();
      g.arc(0, 0, 14, -Math.PI / 2, Math.PI / 2);
      g.lineTo(-4, 0);
      g.closePath();
      g.fillPath();
      g.lineStyle(2.5, 0xbae6fd, 0.95);
      g.strokePath();
    }

    const dodge = getHeroAttackDodgeAction(type, false);
    const radiusX = type === "duelist" ? 34 : type === "warden" ? 22 : 20;
    const radiusY = type === "warden" || type === "breaker" ? 24 : type === "duelist" ? 8 : 14;
    const crouchedBossHeight = this.bossView.collisionHeight * this.cfg.boss.scale * BOSS_CROUCH_HEIGHT;
    const projectileY = dodge === "jump" ? GROUND_Y - 36 : GROUND_Y - crouchedBossHeight - radiusY - 14;
    g.setPosition(x, projectileY);
    this.fx.text(x, projectileY - 30, label, textColor, 21);
    this.fx.text(x, projectileY - 56, dodge === "jump" ? "LOW SHOT · JUMP!" : "HIGH SHOT · CROUCH!", dodge === "jump" ? "#fde047" : "#67e8f9", 16);
    this.fx.ring(x, y, color, 5);
    this.fx.burst(x, projectileY, 8, { colors: [color, 0xffffff], speed: 160, life: 0.3 });
    sfx.fire();

    this.heroProjectiles.push({ g, x, y: projectileY, vx, damage, type, alive: true, color, radiusX, radiusY, enteredBossX: false });
  }

  private updateHeroProjectiles(dt: number) {
    for (let i = this.heroProjectiles.length - 1; i >= 0; i--) {
      const p = this.heroProjectiles[i];
      if (!p.alive) {
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.g.setPosition(p.x, p.y);

      if (Math.random() < 0.4) {
        this.fx.burst(p.x - 10, p.y, 1, { colors: [p.color], speed: 20, life: 0.2, size: 0.2 });
      }

      // 1. 미니언 고기방패 방어
      let blocked = false;
      const overlapsMinionHeight = p.y + p.radiusY >= GROUND_Y - MINION_H && p.y - p.radiusY <= GROUND_Y;
      if (overlapsMinionHeight) {
        for (const m of this.tm.traps) {
          if (m.type === "Minion" && m.state !== "dead") {
            const mx = m.cell * CELL + CELL / 2;
            if (Math.abs(p.x - mx) < 32) {
              m.state = "dead";
              m.sprite.destroy();
              blocked = true;
              this.fx.text(mx, GROUND_Y - 50, "MINION BLOCKED!", "#93c5fd", 22);
              this.fx.burst(mx, GROUND_Y - 30, 12, { colors: [0xf43f5e, 0xffffff], speed: 220, life: 0.35 });
              sfx.stomp();
              break;
            }
          }
        }
      }
      if (blocked) {
        p.alive = false;
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
        continue;
      }

      // Check both horizontal and vertical overlap against the boss's current dodge pose.
      const overlapsBossX = p.x + p.radiusX >= this.bossX - this.bossHalfW
        && p.x - p.radiusX <= this.bossX + this.bossHalfW;
      if (overlapsBossX) {
        p.enteredBossX = true;
        const requiredDodge = getHeroAttackDodgeAction(p.type, false);
        if (this.isBossAvoiding(requiredDodge)) {
          this.showDodgeSuccess(this.bossX, p.y, requiredDodge === "jump" ? "JUMP DODGE!" : "CROUCH DODGE!");
          p.alive = false;
          p.g.destroy();
          this.heroProjectiles.splice(i, 1);
          continue;
        }
        const bossBottom = GROUND_Y - this.bossJumpHeight;
        const bossHeight = this.bossView.collisionHeight * this.cfg.boss.scale * (this.isBossDucking() ? BOSS_CROUCH_HEIGHT : 1);
        const bossTop = bossBottom - bossHeight;
        const overlapsBossY = p.y + p.radiusY >= bossTop && p.y - p.radiusY <= bossBottom;
        if (!overlapsBossY) continue;

        p.alive = false;
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
        this.bossHp = Math.max(0, this.bossHp - p.damage);
        this.bossView.flash();
        sfx.bossHurt();
        this.cameras.main.shake(180, 0.01);
        this.fx.text(this.bossX, GROUND_Y - 140 * this.cfg.boss.scale, `-${p.damage}`, "#ef4444", 34);
        this.fx.burst(this.bossX - 10, p.y, 14, { colors: [0xff4444, 0xffa500, 0xffffff], speed: 240, life: 0.4 });
        this.emitHud();
        if (this.bossHp <= 0) {
          this.finish("boss-defeated");
        }
        continue;
      }

      if (p.enteredBossX && p.x - p.radiusX > this.bossX + this.bossHalfW) {
        this.showDodgeSuccess(this.bossX, p.y, "DODGED!");
        p.alive = false;
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
        continue;
      }

      // 4. 화면 초과 소멸
      if (p.x > this.bossX + 300) {
        p.alive = false;
        p.g.destroy();
        this.heroProjectiles.splice(i, 1);
      }
    }
  }

  private updateBossProjectiles(dt: number) {
    for (let i = this.bossProjectiles.length - 1; i >= 0; i--) {
      const p = this.bossProjectiles[i];
      p.x += p.vx * dt;
      p.g.setPosition(p.x, p.y);
      if (Math.random() < 0.45) {
        this.fx.burst(p.x + 8, p.y, 1, { colors: [p.color, 0xffffff], speed: 26, life: 0.18, size: 0.25 });
      }

      const overlapsHeroX = p.x + p.radius >= this.hero.x - HERO_HALF_W
        && p.x - p.radius <= this.hero.x + HERO_HALF_W;
      if (overlapsHeroX) {
        const heroHeight = this.hero.isCrouching ? HERO_H * 0.56 : HERO_H;
        const heroTop = this.hero.y - heroHeight;
        const overlapsHeroY = p.y + p.radius >= heroTop && p.y - p.radius <= this.hero.y;
        if (overlapsHeroY) {
          const dealt = this.hero.takeDamage(p.damage, "boss-attack", p.x, p.y);
          if (dealt > 0) {
            this.hero.roarT = Math.max(this.hero.roarT, 0.55);
            this.hero.applyStun(0.22);
          }
        } else {
          this.showDodgeSuccess(this.hero.x, p.y, "HE READ YOUR MOVE!");
        }
        p.g.destroy();
        this.bossProjectiles.splice(i, 1);
        continue;
      }

      if (p.x + p.radius < this.hero.x - HERO_HALF_W || p.x < this.cameras.main.scrollX - 80) {
        p.g.destroy();
        this.bossProjectiles.splice(i, 1);
      }
    }
  }

  private comboWindow(): number {
    return BASE_COMBO_WINDOW + (this.cfg.floorIndex === 4 && this.cathedralResonanceT > 0 ? CATHEDRAL_RESONANCE_DURATION : 0);
  }

  private finish(reason: EndReason) {
    if (this.ended) return;
    this.ended = true;
    for (const p of this.heroProjectiles) {
      p.g.destroy();
    }
    this.heroProjectiles = [];
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
      jumpCd: this.jumpCd,
      crouchCd: this.crouchCd,
      spikeCd: this.spikePlaceCd,
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
    const dt = this.tutorialHold ? 0 : Math.min(deltaMs / 1000, 1 / 30);
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
        this.updateBossDodge(dt);
        this.updateSewerSurge(dt);
        this.updateForgeDrop(dt);
        this.updateAbyssEcho(dt);
        this.updateCathedralBell(dt);
        this.bossX += boss.speed * dt;
        this.mana = Math.min(boss.maxMana, this.mana + boss.manaRegen * dt);
        this.spikePlaceCd = Math.max(0, this.spikePlaceCd - dt);
        this.roarCd = Math.max(0, this.roarCd - dt);
      }
      this.hero.update(dt, this.tm, this.bossX, active);
      this.tm.update(dt, this.hero, cam.scrollX);
      if (active) this.updateHeroProjectiles(dt);
      if (active) this.updateBossProjectiles(dt);

      if (active && this.hero.alive && this.hero.contactCd <= 0 && this.bossJumpHeight < BOSS_CONTACT_DODGE_HEIGHT && this.hero.x + HERO_HALF_W >= this.bossX - this.bossHalfW) {
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
    this.bossView.update(dt, active ? boss.speed : 0, this.bossJumpHeight, this.isBossDucking());
    const shadowScale = Math.max(0.4, 1 - this.bossJumpHeight / 280);
    this.bossShadow
      .setPosition(this.bossX - 6, GROUND_Y + 4)
      .setScale(this.cfg.boss.scale * 1.6 * shadowScale, this.cfg.boss.scale * 1.1 * shadowScale)
      .setAlpha(0.8 * shadowScale);
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
      const x0 = -((scrollX * 0.10) % period);
      this.bgImgs.forEach((img, i) => img.setX(Math.round(x0 + i * W)));
    }
    this.pillars.tilePositionX = scrollX * 0.32;
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
      g.fillStyle(0x6cff9a, this.tutorialHold ? 0.2 : 0.06);
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
      g.lineStyle(2, 0xbfffd0, this.tutorialHold ? 0.62 : 0.3);
      g.lineBetween(c0 * CELL, GROUND_Y - 56, c1 * CELL, GROUND_Y - 56);
    }
    if (this.hasPointer) {
      const p = this.input.activePointer;
      const cam = this.cameras.main;
      const cell = this.tm.cellAt(p.x + cam.scrollX);
      const chk = this.tm.canPlace(this.selected, cell, minX, maxX);
      const afford = this.mana >= this.cfg.traps[this.selected].cost;
      const cooldownReady = this.selected !== "Spike" || this.spikePlaceCd <= 0;
      const ok = chk === "ok" && afford && cooldownReady;
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
      if (chk === "ok" && !cooldownReady) {
        this.forecastLabel.setText(`SPIKES READY IN ${this.spikePlaceCd.toFixed(1)}s`).setPosition(cell * CELL + CELL / 2, GROUND_Y - 112).setVisible(true);
      } else if (ok) {
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
