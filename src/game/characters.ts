import Phaser from "phaser";
import type { BossFormDef } from "./types";

type G = Phaser.GameObjects.Graphics;
const OUT = 0x1b1020;

/** 배관공 스타일의 용사. 원점 = 발 중앙 */
export class HeroView {
  readonly container: Phaser.GameObjects.Container;
  private legB: G;
  private legF: G;
  private armB: G;
  private armF: G;
  private torso: G;
  private head: G;
  private flashG: G;
  private phase = 0;

  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.armB = this.makeArm(scene, -1, 0xb5261f);
    this.legB = this.makeLeg(scene, -4, 0x1b2f7d);

    this.torso = scene.add.graphics();
    this.torso.lineStyle(2, OUT, 1);
    this.torso.fillStyle(0x2a4cc6, 1);
    this.torso.fillRoundedRect(-10, -34, 20, 16, 4);
    this.torso.strokeRoundedRect(-10, -34, 20, 16, 4);
    this.torso.fillStyle(0xe8332a, 1);
    this.torso.fillRoundedRect(-11, -46, 22, 15, 5);
    this.torso.strokeRoundedRect(-11, -46, 22, 15, 5);
    this.torso.fillStyle(0x2a4cc6, 1);
    this.torso.fillRect(-8, -46, 4, 14);
    this.torso.fillRect(3, -46, 4, 14);
    this.torso.fillStyle(0xffd23f, 1);
    this.torso.fillCircle(-6, -30, 2.2);
    this.torso.fillCircle(5, -30, 2.2);

    this.legF = this.makeLeg(scene, 4, 0x2a4cc6);

    this.head = scene.add.graphics();
    this.head.lineStyle(2, OUT, 1);
    // 얼굴
    this.head.fillStyle(0xffc79a, 1);
    this.head.fillCircle(1, -54, 11);
    this.head.strokeCircle(1, -54, 11);
    // 코
    this.head.fillStyle(0xf5a97a, 1);
    this.head.fillCircle(11, -52, 4.2);
    this.head.strokeCircle(11, -52, 4.2);
    // 콧수염
    this.head.fillStyle(0x4a2a12, 1);
    this.head.fillEllipse(7, -47, 14, 5);
    // 눈
    this.head.fillStyle(0xffffff, 1);
    this.head.fillEllipse(6, -57, 5.5, 7);
    this.head.fillStyle(0x111111, 1);
    this.head.fillCircle(7.5, -57, 1.8);
    // 모자
    this.head.fillStyle(0xe8332a, 1);
    this.head.beginPath();
    this.head.arc(1, -56, 12, Math.PI, Math.PI * 2, false);
    this.head.closePath();
    this.head.fillPath();
    this.head.strokePath();
    this.head.fillRoundedRect(3, -62, 15, 5, 2);
    this.head.strokeRoundedRect(3, -62, 15, 5, 2);
    this.head.fillStyle(0xffffff, 1);
    this.head.fillCircle(0, -63, 3.8);
    this.head.strokeCircle(0, -63, 3.8);

    this.armF = this.makeArm(scene, 1, 0xe8332a);

    this.flashG = scene.add.graphics();
    this.flashG.fillStyle(0xff2a2a, 1);
    this.flashG.fillEllipse(0, -34, 28, 60);
    this.flashG.setAlpha(0);

    this.container.add([this.armB, this.legB, this.torso, this.legF, this.head, this.armF, this.flashG]);
  }

  private makeLeg(scene: Phaser.Scene, px: number, color: number): G {
    const g = scene.add.graphics({ x: px, y: -19 });
    g.lineStyle(1.5, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-4.5, -1, 9, 17, 3);
    g.fillStyle(0x6b3a1e, 1);
    g.fillEllipse(3, 18, 16, 8);
    g.strokeEllipse(3, 18, 16, 8);
    return g;
  }

  private makeArm(scene: Phaser.Scene, side: number, color: number): G {
    const g = scene.add.graphics({ x: side * 2, y: -42 });
    g.lineStyle(1.5, OUT, 1);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-3.5, -2, 7, 14, 3);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 14, 4.5);
    g.strokeCircle(0, 14, 4.5);
    return g;
  }

  update(dt: number, speed: number, onGround: boolean, dead: boolean) {
    if (dead) {
      this.armF.rotation = -2.7;
      this.armB.rotation = -2.4;
      this.legF.rotation = -0.5;
      this.legB.rotation = 0.5;
      return;
    }
    if (!onGround) {
      this.legF.rotation = -0.85;
      this.legB.rotation = 0.6;
      this.armF.rotation = -2.7;
      this.armB.rotation = -2.1;
      this.torso.y = 0;
      this.head.y = 0;
      return;
    }
    if (speed > 20) {
      this.phase += (dt * speed) / 15;
      const s = Math.sin(this.phase);
      this.legF.rotation = s * 0.95;
      this.legB.rotation = -s * 0.95;
      this.armF.rotation = -s * 0.9;
      this.armB.rotation = s * 0.9;
      const bob = -Math.abs(Math.cos(this.phase)) * 2.5;
      this.torso.y = bob;
      this.head.y = bob;
    } else {
      this.legF.rotation = 0;
      this.legB.rotation = 0;
      this.armF.rotation = 0.15;
      this.armB.rotation = -0.15;
      this.torso.y = 0;
      this.head.y = 0;
    }
  }

  flash() {
    this.flashG.setAlpha(0.75);
    this.flashG.scene.tweens.add({ targets: this.flashG, alpha: 0, duration: 260 });
  }
}

/** 마왕 보스. 원점 = 발 중앙, 기본 키 ~190px */
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

    // 꼬리
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

    // 몸통
    const body = scene.add.graphics();
    body.lineStyle(4, OUT, 1);
    // 등 가시
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
    // 허리띠
    body.fillStyle(p.accent, 1);
    body.fillRect(-42, -54, 84, 9);
    body.fillStyle(0xffd23f, 1);
    body.fillRoundedRect(4, -56, 18, 13, 3);
    body.lineStyle(2, OUT, 1);
    body.strokeRoundedRect(4, -56, 18, 13, 3);

    this.legF = this.makeLeg(scene, 16, p.body);

    // 머리
    const head = scene.add.graphics();
    head.lineStyle(4, OUT, 1);
    // 뿔
    head.fillStyle(p.horn, 1);
    head.fillTriangle(-8, -156, -22, -196, 8, -160);
    head.strokeTriangle(-8, -156, -22, -196, 8, -160);
    head.fillTriangle(22, -160, 42, -198, 40, -154);
    head.strokeTriangle(22, -160, 42, -198, 40, -154);
    // 얼굴
    head.fillStyle(p.body, 1);
    head.fillEllipse(14, -138, 84, 66);
    head.strokeEllipse(14, -138, 84, 66);
    // 눈 (발광)
    head.fillStyle(p.eye, 1);
    head.lineStyle(3, OUT, 1);
    head.fillEllipse(6, -142, 20, 22);
    head.strokeEllipse(6, -142, 20, 22);
    head.fillEllipse(34, -142, 20, 22);
    head.strokeEllipse(34, -142, 20, 22);
    head.fillStyle(0x110008, 1);
    head.fillEllipse(9, -142, 7, 16);
    head.fillEllipse(37, -142, 7, 16);
    // 눈썹
    head.lineStyle(6, OUT, 1);
    head.lineBetween(-6, -158, 16, -150);
    head.lineBetween(46, -158, 24, -150);
    // 입 + 송곳니
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
    // 콧구멍
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
    // 발톱
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
    this.phase += (dt * speed) / 22;
    const s = Math.sin(this.phase);
    this.legF.rotation = s * 0.7;
    this.legB.rotation = -s * 0.7;
    this.armF.rotation = -s * 0.6 - 0.2;
    this.armB.rotation = s * 0.6 - 0.2;
    this.tail.rotation = Math.sin(this.phase * 0.7) * 0.22;
    if (this.wings) this.wings.rotation = Math.sin(this.phase * 0.6) * 0.16;
    const bob = -Math.abs(Math.cos(this.phase)) * 4;
    this.container.y = this.baseY + bob;
  }

  private baseY = 0;
  setBaseY(y: number) {
    this.baseY = y;
  }

  flash() {
    this.flashG.setAlpha(0.8);
    this.flashG.scene.tweens.add({ targets: this.flashG, alpha: 0, duration: 300 });
    const sc = this.baseScale;
    this.container.scene.tweens.add({
      targets: this.container,
      scaleX: sc * 0.9,
      scaleY: sc * 1.08,
      duration: 90,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  roar() {
    const sc = this.baseScale;
    this.container.scene.tweens.add({
      targets: this.container,
      scaleX: sc * 1.12,
      scaleY: sc * 1.12,
      duration: 160,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }
}
