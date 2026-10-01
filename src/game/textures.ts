import Phaser from "phaser";
import { H, W } from "./constants";

type Ctx = CanvasRenderingContext2D;

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  draw(ctx);
  tex.refresh();
}

function outlinePath(c: Ctx, fill: string | CanvasGradient, stroke = "#1b1020", lw = 2) {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = lw;
  c.strokeStyle = stroke;
  c.lineJoin = "round";
  c.stroke();
}

function drawMinion(c: Ctx, helm: boolean) {
  // 48 x 52, a little devil facing left
  // back spikes
  c.beginPath();
  c.moveTo(30, 18);
  c.lineTo(38, 8);
  c.lineTo(38, 22);
  c.lineTo(46, 16);
  c.lineTo(42, 32);
  c.closePath();
  outlinePath(c, "#7a1524");
  // feet
  c.beginPath();
  c.ellipse(16, 49, 8, 4, 0, 0, Math.PI * 2);
  outlinePath(c, "#3b0d18");
  c.beginPath();
  c.ellipse(32, 49, 8, 4, 0, 0, Math.PI * 2);
  outlinePath(c, "#3b0d18");
  // body
  const g = c.createRadialGradient(20, 28, 2, 24, 32, 20);
  g.addColorStop(0, "#ff6b5e");
  g.addColorStop(1, "#c0313f");
  c.beginPath();
  c.ellipse(24, 32, 18, 17, 0, 0, Math.PI * 2);
  outlinePath(c, g);
  // belly
  c.beginPath();
  c.ellipse(21, 40, 9, 7, 0, 0, Math.PI * 2);
  c.fillStyle = "#f7b58a";
  c.fill();
  // horn
  if (!helm) {
    c.beginPath();
    c.moveTo(9, 20);
    c.lineTo(5, 4);
    c.lineTo(17, 15);
    c.closePath();
    outlinePath(c, "#f5e6c8");
    c.beginPath();
    c.moveTo(27, 15);
    c.lineTo(33, 3);
    c.lineTo(35, 20);
    c.closePath();
    outlinePath(c, "#f5e6c8");
  }
  // eyes
  c.beginPath();
  c.ellipse(13, 26, 6, 6.5, 0, 0, Math.PI * 2);
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = "#1b1020";
  c.stroke();
  c.beginPath();
  c.ellipse(26, 26, 5.5, 6.5, 0, 0, Math.PI * 2);
  c.fillStyle = "#fff";
  c.fill();
  c.stroke();
  c.fillStyle = "#1b1020";
  c.beginPath();
  c.arc(11, 27, 2.6, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(24, 27, 2.4, 0, Math.PI * 2);
  c.fill();
  // angry eyebrows
  c.lineWidth = 3;
  c.strokeStyle = "#3b0d18";
  c.beginPath();
  c.moveTo(6, 17);
  c.lineTo(18, 22);
  c.stroke();
  c.beginPath();
  c.moveTo(32, 17);
  c.lineTo(21, 22);
  c.stroke();
  // fire-spitting mouth
  c.beginPath();
  c.ellipse(9, 38, 5, 6, 0, 0, Math.PI * 2);
  c.fillStyle = "#2a0810";
  c.fill();
  c.beginPath();
  c.ellipse(7, 38, 3, 4, 0, 0, Math.PI * 2);
  c.fillStyle = "#ffb02e";
  c.fill();
  if (helm) {
    // spiked helm
    c.beginPath();
    c.moveTo(3, 24);
    c.quadraticCurveTo(4, 6, 22, 5);
    c.quadraticCurveTo(38, 6, 39, 24);
    c.lineTo(3, 24);
    c.closePath();
    outlinePath(c, "#94a3b8");
    c.fillStyle = "#e2e8f0";
    c.fillRect(6, 9, 5, 3);
    for (const sx of [10, 21, 32]) {
      c.beginPath();
      c.moveTo(sx - 4, 10);
      c.lineTo(sx, -2 + (sx === 21 ? 0 : 4));
      c.lineTo(sx + 4, 10);
      c.closePath();
      outlinePath(c, "#e2e8f0");
    }
  }
}

export function createTextures(scene: Phaser.Scene) {
  // soft round particle
  canvasTex(scene, "dot", 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.65)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 32, 32);
  });

  // character shadow
  canvasTex(scene, "shadow", 96, 20, (c) => {
    const g = c.createRadialGradient(48, 10, 0, 48, 10, 48);
    g.addColorStop(0, "rgba(0,0,0,0.6)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.save();
    c.scale(1, 0.42);
    c.fillStyle = g;
    c.fillRect(0, 0, 96, 48);
    c.restore();
  });

  // ground tile (96 x 170)
  canvasTex(scene, "ground", 96, 170, (c) => {
    c.fillStyle = "#170c13";
    c.fillRect(0, 0, 96, 170);
    for (let row = 0; row < 6; row++) {
      const y = 18 + row * 26;
      const off = row % 2 ? 24 : 0;
      for (let bx = -48; bx < 144; bx += 48) {
        const x = bx + off;
        const shade = Math.floor((x + 48) / 48) % 2;
        c.fillStyle = shade ? "#2e1a27" : "#361f2d";
        c.fillRect(x + 1, y + 1, 46, 24);
        c.fillStyle = "rgba(255,255,255,0.04)";
        c.fillRect(x + 1, y + 1, 46, 3);
      }
    }
    // top slab
    const tg = c.createLinearGradient(0, 0, 0, 18);
    tg.addColorStop(0, "#8a5e74");
    tg.addColorStop(1, "#4d3143");
    c.fillStyle = tg;
    c.fillRect(0, 0, 96, 18);
    c.fillStyle = "#b98aa3";
    c.fillRect(0, 0, 96, 3);
    c.fillStyle = "rgba(0,0,0,0.35)";
    for (let x = 24; x < 96; x += 48) c.fillRect(x, 5, 2, 13);
    c.fillStyle = "rgba(0,0,0,0.4)";
    c.fillRect(0, 16, 96, 2);
    // lava cracks
    c.strokeStyle = "rgba(255,122,42,0.6)";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(30, 44);
    c.lineTo(38, 56);
    c.lineTo(33, 70);
    c.stroke();
    c.beginPath();
    c.moveTo(72, 96);
    c.lineTo(64, 108);
    c.lineTo(69, 122);
    c.stroke();
    const shade = c.createLinearGradient(0, 0, 0, 170);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = shade;
    c.fillRect(0, 0, 96, 170);
  });

  // lava, 2 frames (48 x 124); the horizontal period is 48 so the seam is invisible
  [0, 1].forEach((frame) => {
    canvasTex(scene, `lava${frame}`, 48, 124, (c) => {
      const phase = frame * Math.PI;
      const wave = (x: number) => 7 + Math.sin((x / 48) * Math.PI * 2 + phase) * 2.6;
      const g = c.createLinearGradient(0, 0, 0, 124);
      g.addColorStop(0, "#ffe25a");
      g.addColorStop(0.12, "#ffab2e");
      g.addColorStop(0.45, "#ff5a1f");
      g.addColorStop(0.8, "#b8200c");
      g.addColorStop(1, "#5a0c06");
      c.beginPath();
      c.moveTo(0, wave(0));
      for (let x = 0; x <= 48; x += 4) c.lineTo(x, wave(x));
      c.lineTo(48, 124);
      c.lineTo(0, 124);
      c.closePath();
      c.fillStyle = g;
      c.fill();
      // surface highlight
      c.strokeStyle = "rgba(255,244,170,0.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(0, wave(0));
      for (let x = 0; x <= 48; x += 4) c.lineTo(x, wave(x));
      c.stroke();
      // bubbles / flow
      const bubbles = frame === 0 ? [[12, 28, 4], [34, 50, 3], [22, 78, 5]] : [[14, 22, 3], [32, 56, 4], [24, 70, 4]];
      c.fillStyle = "rgba(255,230,120,0.75)";
      for (const [bx, by, br] of bubbles) {
        c.beginPath();
        c.arc(bx, by, br, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = "rgba(255,200,80,0.35)";
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(8, 40 + frame * 6);
      c.quadraticCurveTo(20, 46, 40, 40 + frame * 6);
      c.stroke();
    });
  });

  // ground spikes (48 x 44)
  canvasTex(scene, "spikeGround", 48, 44, (c) => {
    c.beginPath();
    c.roundRect?.(0, 36, 48, 8, 2);
    c.fillStyle = "#3f3a4a";
    c.fill();
    c.strokeStyle = "#1b1020";
    c.lineWidth = 2;
    c.stroke();
    for (let i = 0; i < 3; i++) {
      const cx = 8 + i * 16;
      const g = c.createLinearGradient(cx - 7, 0, cx + 7, 0);
      g.addColorStop(0, "#f1f5f9");
      g.addColorStop(0.5, "#cbd5e1");
      g.addColorStop(0.51, "#7c8aa0");
      g.addColorStop(1, "#64748b");
      c.beginPath();
      c.moveTo(cx - 7, 37);
      c.lineTo(cx, 2);
      c.lineTo(cx + 7, 37);
      c.closePath();
      outlinePath(c, g, "#1b1020", 2);
      c.fillStyle = "rgba(255,60,60,0.85)";
      c.beginPath();
      c.moveTo(cx - 2, 12);
      c.lineTo(cx, 3);
      c.lineTo(cx + 2, 12);
      c.closePath();
      c.fill();
    }
  });

  // hanging (drop) spikes (48 x 60) - pointing down
  canvasTex(scene, "spikeDown", 48, 60, (c) => {
    for (let i = 0; i < 3; i++) {
      const cx = 8 + i * 16;
      const g = c.createLinearGradient(cx - 7, 0, cx + 7, 0);
      g.addColorStop(0, "#f1f5f9");
      g.addColorStop(0.5, "#cbd5e1");
      g.addColorStop(0.51, "#7c8aa0");
      g.addColorStop(1, "#64748b");
      c.beginPath();
      c.moveTo(cx - 7, 20);
      c.lineTo(cx, 58);
      c.lineTo(cx + 7, 20);
      c.closePath();
      outlinePath(c, g, "#1b1020", 2);
      c.fillStyle = "rgba(255,60,60,0.85)";
      c.beginPath();
      c.moveTo(cx - 2, 50);
      c.lineTo(cx, 58);
      c.lineTo(cx + 2, 50);
      c.closePath();
      c.fill();
    }
    c.fillStyle = "#3f3a4a";
    c.fillRect(0, 12, 48, 10);
    c.strokeStyle = "#1b1020";
    c.lineWidth = 2;
    c.strokeRect(1, 13, 46, 8);
    // rope loop
    c.beginPath();
    c.arc(24, 8, 6, 0, Math.PI * 2);
    c.lineWidth = 3;
    c.strokeStyle = "#9ca3af";
    c.stroke();
  });

  canvasTex(scene, "minion", 48, 52, (c) => drawMinion(c, false));
  canvasTex(scene, "minionH", 48, 52, (c) => drawMinion(c, true));

  // fireball (flies left, tail on the right)
  canvasTex(scene, "fireball", 44, 26, (c) => {
    const tail = c.createLinearGradient(44, 0, 12, 0);
    tail.addColorStop(0, "rgba(255,90,20,0)");
    tail.addColorStop(1, "rgba(255,120,30,0.9)");
    c.beginPath();
    c.moveTo(44, 13);
    c.lineTo(14, 3);
    c.lineTo(14, 23);
    c.closePath();
    c.fillStyle = tail;
    c.fill();
    const g = c.createRadialGradient(12, 13, 1, 12, 13, 12);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#ffe066");
    g.addColorStop(0.75, "#ff7a1f");
    g.addColorStop(1, "rgba(255,60,20,0.2)");
    c.beginPath();
    c.arc(12, 13, 12, 0, Math.PI * 2);
    c.fillStyle = g;
    c.fill();
  });

  // exit gate 260 x 420
  canvasTex(scene, "exitGate", 260, 420, (c) => {
    // glow
    const glow = c.createRadialGradient(130, 250, 10, 130, 250, 150);
    glow.addColorStop(0, "rgba(255,250,200,0.9)");
    glow.addColorStop(1, "rgba(255,200,80,0)");
    c.fillStyle = glow;
    c.fillRect(0, 100, 260, 320);
    // pillars
    c.fillStyle = "#3a2a3c";
    c.fillRect(10, 90, 46, 330);
    c.fillRect(204, 90, 46, 330);
    c.strokeStyle = "#140a18";
    c.lineWidth = 3;
    c.strokeRect(10, 90, 46, 330);
    c.strokeRect(204, 90, 46, 330);
    // arch
    c.beginPath();
    c.moveTo(10, 130);
    c.quadraticCurveTo(130, -40, 250, 130);
    c.lineTo(204, 130);
    c.quadraticCurveTo(130, 30, 56, 130);
    c.closePath();
    outlinePath(c, "#4a3550", "#140a18", 3);
    // inside of the doorway (daylight)
    c.beginPath();
    c.moveTo(56, 420);
    c.lineTo(56, 130);
    c.quadraticCurveTo(130, 30, 204, 130);
    c.lineTo(204, 420);
    c.closePath();
    const inner = c.createLinearGradient(0, 60, 0, 420);
    inner.addColorStop(0, "#fffbe0");
    inner.addColorStop(1, "#ffd15a");
    c.fillStyle = inner;
    c.fill();
    // light rays
    c.strokeStyle = "rgba(255,255,255,0.55)";
    c.lineWidth = 4;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(130, 200);
      c.lineTo(80 + i * 25, 420);
      c.stroke();
    }
    // sign
    c.fillStyle = "#140a18";
    c.fillRect(70, 40, 120, 34);
    c.fillStyle = "#ffcf4a";
    c.font = "bold 24px sans-serif";
    c.textAlign = "center";
    c.fillText("EXIT", 130, 65);
    c.fillStyle = "#4a3550";
    for (let i = 0; i < 4; i++) c.fillRect(10, 130 + i * 70, 46, 4);
    for (let i = 0; i < 4; i++) c.fillRect(204, 130 + i * 70, 46, 4);
  });

  // midground pillars (repeating tile 640 x 720)
  canvasTex(scene, "pillars", 640, 720, (c) => {
    for (const px of [110, 430]) {
      const g = c.createLinearGradient(px, 0, px + 84, 0);
      g.addColorStop(0, "rgba(46,16,26,0.92)");
      g.addColorStop(1, "rgba(14,5,12,0.96)");
      c.fillStyle = g;
      c.fillRect(px, 0, 84, 720);
      c.fillStyle = "rgba(255,110,50,0.28)";
      c.fillRect(px, 0, 3, 720);
      // capital / base
      c.fillStyle = "rgba(20,7,16,0.96)";
      c.fillRect(px - 16, 0, 116, 44);
      c.fillRect(px - 10, 44, 104, 20);
      c.fillRect(px - 16, 640, 116, 80);
      c.fillStyle = "rgba(255,110,50,0.22)";
      c.fillRect(px - 16, 44, 116, 2);
      c.fillRect(px - 16, 640, 116, 2);
      // flutes
      c.fillStyle = "rgba(0,0,0,0.35)";
      for (let i = 1; i < 4; i++) c.fillRect(px + i * 20, 64, 2, 576);
    }
  });

  // vignette
  canvasTex(scene, "vignette", W, H, (c) => {
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(8,0,10,0.7)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  });
}
