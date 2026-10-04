import Phaser from "phaser";
import type { BossFormDef, HeroCharacterDef } from "./types";

type G = Phaser.GameObjects.Graphics;
const OUT = 0x1b1020;

type HeroAnimationState = "idle" | "run" | "jump" | "fall" | "hit" | "stun" | "brace" | "land" | "rage" | "death";

/** Data-driven hero assembled from a shared skeleton and floor identity. */
export class HeroView {
  readonly container: Phaser.GameObjects.Container;
  private cape: G;
  private legB: G;
  private legF: G;
  private armB: G;
  private armF: G;
  private torso: G;
  private head: G;
  private gear: G;
  private flashG: G;
  private rageG: G;
  private phase = 0;
  private hitT = 0;
  private launchT = 0;
  private braceT = 0;
  private landT = 0;
  private animationState: HeroAnimationState = "idle";

  constructor(scene: Phaser.Scene, private def: HeroCharacterDef) {
    const p = def.palette;
    this.container = scene.add.container(0, 0);
    this.cape = scene.add.graphics();
    this.drawCape();
    this.armB = this.makeArm(scene, -1, p.cloth);
    this.legB = this.makeLeg(scene, -4, p.armor);

    this.torso = scene.add.graphics();
    this.torso.lineStyle(2, OUT, 1);
    this.torso.fillStyle(p.armor, 1);
    this.torso.fillRoundedRect(-10, -34, 20, 16, 4);
    this.torso.strokeRoundedRect(-10, -34, 20, 16, 4);
    this.torso.fillStyle(p.cloth, 1);
    this.torso.fillRoundedRect(-11, -47, 22, 16, def.silhouette === "warden" ? 3 : 5);
    this.torso.strokeRoundedRect(-11, -47, 22, 16, def.silhouette === "warden" ? 3 : 5);
    this.torso.fillStyle(p.accent, 1);
    this.torso.fillTriangle(-8, -44, 0, -33, 8, -44);
    this.torso.fillStyle(p.metal, 1);
    this.torso.fillRoundedRect(-4, -29, 8, 5, 2);
    if (def.silhouette === "warden" || def.silhouette === "duelist") {
      this.torso.fillStyle(p.metal, 1);
      this.torso.fillRoundedRect(-16, -46, 9, 12, 3);
      this.torso.strokeRoundedRect(-16, -46, 9, 12, 3);
      this.torso.fillRoundedRect(7, -46, 9, 12, 3);
      this.torso.strokeRoundedRect(7, -46, 9, 12, 3);
    }

    this.legF = this.makeLeg(scene, 4, p.cloth);

    this.head = scene.add.graphics();
    this.head.lineStyle(2, OUT, 1);
    this.drawHead();

    this.armF = this.makeArm(scene, 1, p.cloth);
    this.gear = scene.add.graphics();
    this.drawGear();

    this.rageG = scene.add.graphics();
    this.rageG.lineStyle(2, p.accent, 0.9);
    this.rageG.strokeEllipse(0, -35, 38, 68);
    this.rageG.setAlpha(0);

    this.flashG = scene.add.graphics();
    this.flashG.fillStyle(0xff2a2a, 1);
    this.flashG.fillEllipse(0, -34, 28, 60);
    this.flashG.setAlpha(0);

    this.container.add([this.cape, this.armB, this.legB, this.torso, this.legF, this.head, this.armF, this.gear, this.rageG, this.flashG]);
  }

  private drawCape() {
    const p = this.def.palette;
    const g = this.cape;
    g.lineStyle(2, OUT, 1);
    if (this.def.silhouette === "scout") {
      g.fillStyle(p.cloth, 1);
      g.beginPath();
      g.moveTo(-8, -44); g.lineTo(-18, -40); g.lineTo(-23, -20); g.lineTo(-13, -27); g.lineTo(-5, -22); g.closePath();
      g.fillPath(); g.strokePath();
    } else if (this.def.silhouette === "breaker") {
      g.fillStyle(p.cloth, 1);
      g.beginPath();
      g.moveTo(-8, -44); g.lineTo(-18, -39); g.lineTo(-31, -8); g.lineTo(-20, -13); g.lineTo(-17, -3); g.lineTo(-7, -24); g.closePath();
      g.fillPath(); g.strokePath();
      g.lineStyle(2, p.accent, 0.9); g.lineBetween(-23, -27, -15, -31);
    } else if (this.def.silhouette === "duelist") {
      g.fillStyle(p.cloth, 1);
      g.beginPath();
      g.moveTo(-8, -45); g.lineTo(-17, -41); g.lineTo(-22, -13); g.lineTo(-10, -23); g.closePath();
      g.fillPath(); g.strokePath();
      g.lineStyle(2, p.accent, 1); g.lineBetween(-18, -33, -10, -38);
    } else if (this.def.silhouette === "apprentice") {
      g.lineStyle(4, p.accent, 1); g.lineBetween(-9, -43, -20, -35); g.lineBetween(-20, -35, -24, -25);
    }
  }

  private drawHead() {
    const p = this.def.palette;
    const g = this.head;
    g.fillStyle(p.skin, 1);
    this.head.fillCircle(1, -54, 11);
    this.head.strokeCircle(1, -54, 11);
    g.fillStyle(p.hair, 1);
    if (this.def.silhouette === "scout") {
      g.fillEllipse(0, -60, 26, 17);
      g.lineStyle(2, OUT, 1); g.strokeEllipse(0, -60, 26, 17);
    } else if (this.def.silhouette === "warden") {
      g.fillRoundedRect(-12, -68, 25, 12, 4);
      g.strokeRoundedRect(-12, -68, 25, 12, 4);
      g.fillStyle(p.metal, 1); g.fillRect(-11, -58, 24, 4); g.strokeRect(-11, -58, 24, 4);
      g.fillStyle(p.accent, 1); g.fillTriangle(-2, -67, 4, -81, 8, -66); g.strokeTriangle(-2, -67, 4, -81, 8, -66);
    } else if (this.def.silhouette === "breaker") {
      g.beginPath(); g.moveTo(-13, -58); g.lineTo(-10, -74); g.lineTo(0, -82); g.lineTo(12, -72); g.lineTo(14, -58); g.closePath();
      g.fillStyle(p.cloth, 1); g.fillPath(); g.lineStyle(2, OUT, 1); g.strokePath();
      g.fillStyle(p.accent, 1); g.fillTriangle(-11, -67, -20, -77, -7, -74); g.fillTriangle(10, -68, 20, -78, 9, -74);
    } else if (this.def.silhouette === "duelist") {
      g.fillEllipse(0, -61, 25, 12);
      g.lineStyle(2, OUT, 1); g.strokeEllipse(0, -61, 25, 12);
      g.fillStyle(p.metal, 1); g.fillTriangle(-9, -64, -10, -74, -3, -65); g.fillTriangle(0, -64, 3, -78, 6, -64); g.fillTriangle(8, -64, 14, -73, 13, -63);
    } else {
      g.beginPath(); g.moveTo(-10, -59); g.lineTo(-9, -67); g.lineTo(-3, -65); g.lineTo(1, -71); g.lineTo(5, -64); g.lineTo(12, -66); g.lineTo(12, -58); g.closePath();
      g.fillPath(); g.lineStyle(2, OUT, 1); g.strokePath();
      g.lineStyle(3, p.accent, 1); g.lineBetween(-11, -57, 12, -56);
    }
    this.head.fillStyle(0xffffff, 1);
    this.head.fillEllipse(6, -57, 5.5, 7);
    this.head.fillStyle(p.eye, 1);
    this.head.fillCircle(7.5, -57, 1.8);
    g.fillStyle(p.skin, 1); g.fillCircle(12, -52, 2.2);
    g.lineStyle(2, p.hair, 1); g.lineBetween(3, -48, 9, -47);
    if (this.def.silhouette === "scout") {
      g.lineStyle(2, p.metal, 1); g.strokeCircle(-3, -58, 4.2); g.strokeCircle(7, -58, 4.2); g.lineBetween(1, -58, 3, -58);
    }
  }

  private drawGear() {
    const p = this.def.palette;
    const g = this.gear;
    g.lineStyle(2, OUT, 1);
    if (this.def.silhouette === "apprentice" || this.def.silhouette === "duelist") {
      g.lineStyle(4, p.metal, 1); g.lineBetween(13, -39, 25, -57);
      g.lineStyle(3, p.accent, 1); g.lineBetween(12, -38, 18, -34);
      g.lineStyle(2, OUT, 1); g.lineBetween(13, -39, 25, -57);
    } else if (this.def.silhouette === "scout") {
      g.fillStyle(p.accent, 1); g.fillCircle(-15, -31, 4); g.lineStyle(2, p.metal, 1); g.strokeCircle(-15, -31, 5);
      g.lineStyle(2, p.metal, 1); g.lineBetween(-15, -26, -15, -21);
    } else if (this.def.silhouette === "warden") {
      g.fillStyle(p.accent, 1); g.fillCircle(15, -35, 3); g.lineStyle(2, p.metal, 1); g.strokeCircle(15, -35, 5);
    } else {
      g.lineStyle(4, p.metal, 1); g.lineBetween(15, -39, 25, -55); g.lineStyle(2, OUT, 1); g.lineBetween(15, -39, 25, -55);
      g.fillStyle(p.accent, 1); g.fillCircle(26, -57, 3); g.lineStyle(1, OUT, 1); g.strokeCircle(26, -57, 3);
    }
  }

  private makeLeg(scene: Phaser.Scene, px: number, color: number): G {
    const g = scene.add.graphics({ x: px, y: -19 });
    g.lineStyle(1.5, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-4.5, -1, 9, 17, 3);
    g.fillStyle(this.def.palette.accent, 1);
    g.fillRect(-3.5, 2, 2, 8);
    g.fillStyle(0x302229, 1);
    g.fillEllipse(3, 18, 16, 8);
    g.strokeEllipse(3, 18, 16, 8);
    return g;
  }

  private makeArm(scene: Phaser.Scene, side: number, color: number): G {
    const g = scene.add.graphics({ x: side * 2, y: -42 });
    g.lineStyle(1.5, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-3.5, -2, 7, 14, 3);
    g.fillStyle(this.def.palette.skin, 1);
    g.fillCircle(0, 14, 4.5);
    g.strokeCircle(0, 14, 4.5);
    return g;
  }

  update(dt: number, speed: number, onGround: boolean, vy: number, dead: boolean, stunned: boolean, rage: boolean) {
    this.hitT = Math.max(0, this.hitT - dt);
    this.launchT = Math.max(0, this.launchT - dt);
    this.braceT = Math.max(0, this.braceT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.phase += dt * (speed > 20 ? speed / 15 : 3.5);
    this.animationState = dead ? "death" : stunned ? "stun" : this.hitT > 0 ? "hit" : this.braceT > 0 ? "brace" : !onGround ? (vy < 0 ? "jump" : "fall") : this.landT > 0 ? "land" : speed > 20 ? "run" : rage ? "rage" : "idle";
    this.container.setScale(1);
    if (this.animationState !== "death") this.container.rotation = 0;
    this.torso.y = 0;
    this.head.y = 0;
    this.rageG.setAlpha(rage ? 0.28 + Math.sin(this.phase * 2) * 0.1 : 0);

    if (this.animationState === "death") {
      this.armF.rotation = -2.7;
      this.armB.rotation = -2.4;
      this.legF.rotation = -0.5;
      this.legB.rotation = 0.5;
      return;
    }
    if (this.animationState === "jump") {
      this.legF.rotation = -0.85;
      this.legB.rotation = 0.6;
      this.armF.rotation = -2.2;
      this.armB.rotation = -2.5;
      if (this.launchT > 0) this.container.setScale(1.06, 0.88);
    } else if (this.animationState === "fall") {
      this.legF.rotation = 0.7;
      this.legB.rotation = -0.8;
      this.armF.rotation = -2.9;
      this.armB.rotation = 1.8;
      this.torso.y = 1;
      this.head.y = 1;
    } else if (this.animationState === "run") {
      const s = Math.sin(this.phase);
      this.legF.rotation = s * 0.95;
      this.legB.rotation = -s * 0.95;
      this.armF.rotation = -s * 0.9;
      this.armB.rotation = s * 0.9;
      const bob = -Math.abs(Math.cos(this.phase)) * 2.5;
      this.torso.y = bob;
      this.head.y = bob;
    } else if (this.animationState === "hit" || this.animationState === "stun") {
      this.legF.rotation = 0.15;
      this.legB.rotation = -0.15;
      this.armF.rotation = -1.5;
      this.armB.rotation = 1.2;
      this.torso.y = Math.sin(this.phase * 12) * 1.5;
      this.head.y = -2;
      this.container.rotation = this.animationState === "hit" ? 0.12 : Math.sin(this.phase * 18) * 0.08;
    } else if (this.animationState === "brace") {
      this.legF.rotation = -0.2;
      this.legB.rotation = 0.5;
      this.armF.rotation = -1.8;
      this.armB.rotation = 1.3;
      this.torso.y = 2;
      this.container.rotation = -0.12;
    } else if (this.animationState === "land") {
      this.legF.rotation = 0;
      this.legB.rotation = 0;
      this.armF.rotation = -0.5;
      this.armB.rotation = 0.7;
      this.torso.y = 2;
      this.container.setScale(1.08, 0.84);
    } else {
      this.legF.rotation = 0;
      this.legB.rotation = 0;
      const breath = Math.sin(this.phase) * (this.animationState === "rage" ? 1.2 : 0.7);
      this.armF.rotation = 0.15 + breath * 0.04;
      this.armB.rotation = -0.15 - breath * 0.04;
      this.torso.y = -breath;
      this.head.y = -breath;
    }
  }

  flash() {
    this.hitT = 0.24;
    this.flashG.setAlpha(0.75);
    this.flashG.scene.tweens.add({ targets: this.flashG, alpha: 0, duration: 260 });
  }

  brace() {
    this.braceT = 0.3;
  }

  launch() {
    this.launchT = 0.1;
  }

  land() {
    this.landT = 0.16;
  }

  get state(): HeroAnimationState {
    return this.animationState;
  }
}

/** Demon boss. Origin = center of the feet, default height ~190px */
export class BossView {
  readonly container: Phaser.GameObjects.Container;
  private legB: G;
  private legF: G;
  private armB: G;
  private armF: G;
  private tail: G;
  private wings?: G;
  private flashG: G;
  private aura?: Phaser.GameObjects.Image;
  private phase = 0;
  private roarT = 0;
  private hitT = 0;
  private baseScale: number;

  constructor(scene: Phaser.Scene, def: BossFormDef) {
    const p = def.palette;
    this.baseScale = def.scale;
    this.container = scene.add.container(0, 0);
    const parts: Phaser.GameObjects.GameObject[] = [];

    if (def.aura) {
      this.aura = scene.add.image(0, -90, "dot").setTint(0xff5a1f).setBlendMode(Phaser.BlendModes.ADD);
      this.aura.setScale(9).setAlpha(0.55);
      scene.tweens.add({
        targets: this.aura,
        alpha: { from: 0.35, to: 0.7 },
        scale: { from: 8.2, to: 9.6 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
      parts.push(this.aura);
    }

    if (def.wings) {
      this.wings = scene.add.graphics({ x: -14, y: -112 });
      this.wings.lineStyle(3, OUT, 1);
      this.wings.fillStyle(p.accent, 1);
      this.wings.beginPath();
      this.wings.moveTo(0, 0);
      this.wings.lineTo(-62, -58);
      this.wings.lineTo(-52, -20);
      this.wings.lineTo(-86, -30);
      this.wings.lineTo(-64, 6);
      this.wings.lineTo(-84, 14);
      this.wings.lineTo(-40, 26);
      this.wings.lineTo(0, 24);
      this.wings.closePath();
      this.wings.fillPath();
      this.wings.strokePath();
      parts.push(this.wings);
    }

    // tail
    this.tail = scene.add.graphics({ x: -40, y: -62 });
    this.tail.lineStyle(9, p.body, 1);
    this.tail.beginPath();
    this.tail.moveTo(0, 0);
    this.tail.lineTo(-24, 8);
    this.tail.lineTo(-44, -6);
    this.tail.strokePath();
    this.tail.fillStyle(p.horn, 1);
    this.tail.lineStyle(2, OUT, 1);
    this.tail.fillTriangle(-40, -16, -62, -6, -42, 4);
    this.tail.strokeTriangle(-40, -16, -62, -6, -42, 4);
    parts.push(this.tail);

    this.armB = this.makeArm(scene, p.accent, p.horn);
    this.legB = this.makeLeg(scene, -16, p.accent);

    // torso
    const body = scene.add.graphics();
    body.lineStyle(4, OUT, 1);
    // back spikes
    body.fillStyle(p.horn, 1);
    for (let i = 0; i < 4; i++) {
      const y = -118 + i * 20;
      body.fillTriangle(-40 + i * 3, y, -66 + i * 4, y + 6, -42 + i * 3, y + 22);
      body.strokeTriangle(-40 + i * 3, y, -66 + i * 4, y + 6, -42 + i * 3, y + 22);
    }
    body.fillStyle(p.body, 1);
    body.fillEllipse(0, -80, 104, 98);
    body.strokeEllipse(0, -80, 104, 98);
    body.fillStyle(p.belly, 1);
    body.fillEllipse(12, -72, 60, 68);
    body.lineStyle(2, OUT, 0.6);
    body.strokeEllipse(12, -72, 60, 68);
    body.lineStyle(2, OUT, 0.35);
    for (let i = 0; i < 3; i++) body.lineBetween(-2, -88 + i * 16, 26, -88 + i * 16);
    // belt
    body.fillStyle(p.accent, 1);
    body.fillRect(-42, -54, 84, 9);
    body.fillStyle(0xffd23f, 1);
    body.fillRoundedRect(4, -56, 18, 13, 3);
    body.lineStyle(2, OUT, 1);
    body.strokeRoundedRect(4, -56, 18, 13, 3);

    this.legF = this.makeLeg(scene, 16, p.body);

    // head
    const head = scene.add.graphics();
    head.lineStyle(4, OUT, 1);
    // horn
    head.fillStyle(p.horn, 1);
    head.fillTriangle(-8, -156, -22, -196, 8, -160);
    head.strokeTriangle(-8, -156, -22, -196, 8, -160);
    head.fillTriangle(22, -160, 42, -198, 40, -154);
    head.strokeTriangle(22, -160, 42, -198, 40, -154);
    // face
    head.fillStyle(p.body, 1);
    head.fillEllipse(14, -138, 84, 66);
    head.strokeEllipse(14, -138, 84, 66);
    // eyes (glowing)
    head.fillStyle(p.eye, 1);
    head.lineStyle(3, OUT, 1);
    head.fillEllipse(6, -142, 20, 22);
    head.strokeEllipse(6, -142, 20, 22);
    head.fillEllipse(34, -142, 20, 22);
    head.strokeEllipse(34, -142, 20, 22);
    head.fillStyle(0x110008, 1);
    head.fillEllipse(9, -142, 7, 16);
    head.fillEllipse(37, -142, 7, 16);
    // eyebrows
    head.lineStyle(6, OUT, 1);
    head.lineBetween(-6, -158, 16, -150);
    head.lineBetween(46, -158, 24, -150);
    // mouth + fangs
    head.fillStyle(0x1a0410, 1);
    head.lineStyle(3, OUT, 1);
    head.beginPath();
    head.moveTo(-2, -126);
    head.lineTo(38, -126);
    head.lineTo(32, -114);
    head.lineTo(4, -114);
    head.closePath();
    head.fillPath();
    head.strokePath();
    head.fillStyle(0xffffff, 1);
    head.fillTriangle(2, -126, 10, -126, 6, -117);
    head.fillTriangle(30, -126, 38, -126, 34, -117);
    head.fillTriangle(16, -126, 22, -126, 19, -120);
    // nostrils
    head.fillStyle(p.accent, 1);
    head.fillCircle(16, -134, 2);
    head.fillCircle(24, -134, 2);

    if (def.crown) {
      head.fillStyle(0xffd23f, 1);
      head.lineStyle(3, OUT, 1);
      head.beginPath();
      head.moveTo(-6, -164);
      head.lineTo(-10, -186);
      head.lineTo(4, -174);
      head.lineTo(16, -192);
      head.lineTo(28, -174);
      head.lineTo(42, -186);
      head.lineTo(38, -164);
      head.closePath();
      head.fillPath();
      head.strokePath();
      head.fillStyle(0xff2d55, 1);
      head.fillCircle(16, -176, 4);
    }

    this.armF = this.makeArm(scene, p.body, p.horn);

    this.flashG = scene.add.graphics();
    this.flashG.fillStyle(0xffffff, 1);
    this.flashG.fillEllipse(0, -80, 108, 102);
    this.flashG.fillEllipse(14, -138, 88, 70);
    this.flashG.setAlpha(0);

    parts.push(this.armB, this.legB, body, this.legF, head, this.armF, this.flashG);
    this.container.add(parts);
    this.container.setScale(this.baseScale);
  }

  private makeLeg(scene: Phaser.Scene, px: number, color: number): G {
    const g = scene.add.graphics({ x: px, y: -50 });
    g.lineStyle(3, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-11, -2, 22, 40, 8);
    g.strokeRoundedRect(-11, -2, 22, 40, 8);
    g.fillStyle(0x2a0f1a, 1);
    g.fillEllipse(6, 44, 40, 16);
    g.strokeEllipse(6, 44, 40, 16);
    // claws
    g.fillStyle(0xf5e6c8, 1);
    g.fillTriangle(20, 40, 30, 46, 20, 50);
    return g;
  }

  private makeArm(scene: Phaser.Scene, color: number, claw: number): G {
    const g = scene.add.graphics({ x: 22, y: -100 });
    g.lineStyle(3, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-9, -4, 18, 44, 8);
    g.strokeRoundedRect(-9, -4, 18, 44, 8);
    g.fillCircle(0, 44, 12);
    g.strokeCircle(0, 44, 12);
    g.fillStyle(claw, 1);
    g.fillTriangle(6, 50, 16, 58, 4, 56);
    g.fillTriangle(-2, 54, 4, 64, -6, 58);
    return g;
  }

  update(dt: number, speed: number) {
    this.phase += dt * (speed > 20 ? speed / 22 : 2.2);
    this.roarT = Math.max(0, this.roarT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    const s = Math.sin(this.phase);
    const moving = speed > 20;
    this.legF.rotation = moving ? s * 0.7 : Math.sin(this.phase * 0.5) * 0.025;
    this.legB.rotation = moving ? -s * 0.7 : -Math.sin(this.phase * 0.5) * 0.025;
    this.armF.rotation = this.roarT > 0 ? -1.8 : moving ? -s * 0.6 - 0.2 : -0.18;
    this.armB.rotation = this.roarT > 0 ? -2.0 : moving ? s * 0.6 - 0.2 : 0.18;
    this.tail.rotation = Math.sin(this.phase * (moving ? 0.7 : 0.35)) * (moving ? 0.22 : 0.08);
    if (this.wings) this.wings.rotation = this.roarT > 0 ? Math.sin(this.roarT * 22) * 0.25 : Math.sin(this.phase * (moving ? 0.6 : 0.3)) * (moving ? 0.16 : 0.05);
    const bob = moving ? -Math.abs(Math.cos(this.phase)) * 4 : Math.sin(this.phase * 0.5) * 1.5;
    this.container.y = this.baseY + bob;
    const roarPulse = this.roarT > 0 ? Math.sin((0.45 - this.roarT) / 0.45 * Math.PI) : 0;
    const hitPulse = this.hitT > 0 ? Math.sin((0.18 - this.hitT) / 0.18 * Math.PI) : 0;
    this.container.setScale(this.baseScale * (1 + Math.max(roarPulse * 0.08, hitPulse * 0.05)), this.baseScale * (1 - roarPulse * 0.04 + hitPulse * 0.025));
    if (this.aura) this.aura.setAlpha(this.roarT > 0 ? 0.8 : 0.55 + Math.sin(this.phase) * 0.08);
  }

  private baseY = 0;
  setBaseY(y: number) {
    this.baseY = y;
  }

  flash() {
    this.hitT = 0.18;
    this.flashG.setAlpha(0.8);
    this.flashG.scene.tweens.add({ targets: this.flashG, alpha: 0, duration: 300 });
  }

  roar() {
    this.roarT = 0.45;
  }
}
