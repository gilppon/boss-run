// Lightweight WebAudio sound effects (no external assets)
let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(c.destination);
  src.start(c.currentTime + delay);
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
  },
  unlock() {
    getCtx();
  },
  click() {
    tone(520, 0.06, "square", 0.05);
  },
  place() {
    tone(240, 0.08, "square", 0.06, 340);
  },
  denied() {
    tone(140, 0.12, "sawtooth", 0.05, 90);
  },
  hit() {
    tone(180, 0.18, "sawtooth", 0.09, 60);
    noise(0.12, 0.08);
  },
  lava() {
    noise(0.35, 0.09);
    tone(120, 0.3, "sawtooth", 0.06, 60);
  },
  fire() {
    noise(0.12, 0.04);
    tone(420, 0.12, "triangle", 0.04, 200);
  },
  stomp() {
    tone(300, 0.1, "square", 0.07, 700);
  },
  spikeDrop() {
    tone(900, 0.25, "triangle", 0.04, 200);
  },
  spikeLand() {
    noise(0.15, 0.09);
    tone(110, 0.12, "square", 0.07, 70);
  },
  roar() {
    tone(90, 0.7, "sawtooth", 0.13, 40);
    tone(140, 0.6, "square", 0.05, 60);
    noise(0.5, 0.06);
  },
  bossHurt() {
    tone(200, 0.3, "sawtooth", 0.12, 50);
    noise(0.2, 0.1);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.07, undefined, i * 0.11));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.24, "triangle", 0.09, undefined, i * 0.15));
  },
  coin() {
    tone(988, 0.07, "square", 0.05);
    tone(1319, 0.14, "square", 0.05, undefined, 0.07);
  },
  go() {
    tone(660, 0.25, "square", 0.07, 990);
  },
};
