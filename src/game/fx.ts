import Phaser from "phaser";

interface Particle {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  g: number;
  life: number;
  max: number;
  s0: number;
}

export interface BurstOpts {
  colors: number[];
  speed?: number;
  life?: number;
  gravity?: number;
  size?: number;
  up?: number; // 위쪽 편향
  spreadX?: number;
  additive?: boolean;
}

export const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';

// 저사양 모드: 파티클 생성량 절반 + 상시 이펙트間引き. App에서 save.lowFx와 동기화.
let qualityScale = 1;
export function setFxQuality(low: boolean) {
  qualityScale = low ? 0.5 : 1;
}

const MAX_PARTS = 320;

export class Fx {
  private parts: Particle[] = [];
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(private scene: Phaser.Scene) {}

  get lowFx() {
    return qualityScale < 1;
  }

  private acquire(x: number, y: number): Phaser.GameObjects.Image {
    const img = this.pool.pop() ?? this.scene.add.image(x, y, "dot");
    img.setPosition(x, y).setVisible(true).setAlpha(1).setDepth(20);
    return img;
  }

  private release(img: Phaser.GameObjects.Image) {
    img.setVisible(false);
    if (this.pool.length < MAX_PARTS) this.pool.push(img);
    else img.destroy();
  }

  burst(x: number, y: number, count: number, o: BurstOpts) {
    const n = Math.max(1, Math.round(count * qualityScale));
    const speed = o.speed ?? 220;
    for (let i = 0; i < n; i++) {
      if (this.parts.length > MAX_PARTS) return;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.35 + Math.random() * 0.65);
      const color = o.colors[Math.floor(Math.random() * o.colors.length)];
      const size = (o.size ?? 0.5) * (0.6 + Math.random() * 0.8);
      const img = this.acquire(x, y).setTint(color).setScale(size);
      if (o.additive !== false) img.setBlendMode(Phaser.BlendModes.ADD);
      else img.setBlendMode(Phaser.BlendModes.NORMAL);
      const life = (o.life ?? 0.6) * (0.6 + Math.random() * 0.6);
      this.parts.push({
        img,
        vx: Math.cos(a) * sp * (o.spreadX ?? 1),
        vy: Math.sin(a) * sp - (o.up ?? 0) * Math.random(),
        g: o.gravity ?? 500,
        life,
        max: life,
        s0: size,
      });
    }
  }

  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.release(p.img);
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.img.x += p.vx * dt;
      p.img.y += p.vy * dt;
      const k = p.life / p.max;
      p.img.setAlpha(k);
      p.img.setScale(p.s0 * (0.4 + 0.6 * k));
    }
  }

  text(x: number, y: number, str: string, color = "#ffffff", size = 26) {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: "bold",
        color,
        stroke: "#1b1020",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.scene.tweens.add({
      targets: t,
      y: y - 70,
      alpha: 0,
      scale: { from: 0.6, to: 1.15 },
      duration: 950,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  /** 화면 고정 텍스트(카운트다운 등) */
  banner(x: number, y: number, str: string, color = "#fff", size = 72, ms = 900) {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: "bold",
        color,
        stroke: "#1b1020",
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setScrollFactor(0);
    this.scene.tweens.add({
      targets: t,
      scale: { from: 0.4, to: 1.1 },
      alpha: { from: 1, to: 0 },
      duration: ms,
      ease: "Cubic.easeOut",
      onComplete: () => t.destroy(),
    });
  }

  ring(x: number, y: number, color: number, maxScale = 12) {
    const r = this.scene.add
      .image(x, y, "dot")
      .setTint(color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(19)
      .setScale(0.5)
      .setAlpha(0.9);
    this.scene.tweens.add({
      targets: r,
      scale: maxScale,
      alpha: 0,
      duration: 520,
      ease: "Cubic.easeOut",
      onComplete: () => r.destroy(),
    });
  }

  clear() {
    this.parts.forEach((p) => this.release(p.img));
    this.parts = [];
  }
}
