// Lightweight WebAudio sound effects (no external assets)
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let enabled = true;
let musicVolume = 1;
let effectsVolume = 1;
// Separate from `enabled` so unmuting after an ad never un-mutes a player-muted game.
let adMuted = false;

function getCtx(): AudioContext | null {
  if (!enabled || adMuted) return null;
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = effectsVolume;
      sfxGain.connect(master);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function applyGain() {
  if (!master || !ctx) return;
  const target = enabled && !adMuted ? 1 : 0;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setTargetAtTime(target, now, 0.012);
}

// ---- Background music: dark D-minor war groove, no assets ----
// Reuses tone()/noise(), which already refuse to schedule while the game is
// disabled (!enabled) or ad-muted, and routes everything through master.
let musicGain: GainNode | null = null;
let musicIntensityGain: GainNode | null = null;
let musicDuckGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicStep = 0;
let musicNextTime = 0;
let musicPaused = false;
let musicIntensity = 0;
let musicIntensityTarget = 0;
export const MUSIC_STEP_SECONDS = 0.14;
const MUSIC_LOOKAHEAD_SECONDS = 0.08;
const MUSIC_TICK_MS = 25;
const MUSIC_PHRASE_STEPS = 64;
const MUSIC_LOOP_PHRASES = 4;
// Measured in a live B1 run at -38 LUFS / -19.3 dBTP before this gain.
// +6 dB raises the bed while leaving >13 dB peak headroom at the default mix.
const MUSIC_BASE_GAIN = 1.1;
interface MusicTheme {
  roots: readonly number[];
  chords: readonly (readonly number[])[];
  motif: readonly number[];
  rhythm: readonly RhythmPattern[];
}

interface RhythmPattern {
  kick: number;
  snare: number;
  hats: number;
  bass: number;
}

function rhythmPattern(kick: readonly number[], snare: readonly number[], hats: readonly number[], bass: readonly number[]): RhythmPattern {
  const mask = (steps: readonly number[]) => steps.reduce((result, step) => result | (1 << step), 0);
  return { kick: mask(kick), snare: mask(snare), hats: mask(hats), bass: mask(bass) };
}

const MUSIC_THEMES: readonly MusicTheme[] = [
  {
    roots: [73.42, 58.27, 87.31, 65.41], // Dm → Bb → F → C
    chords: [
      [146.83, 174.61, 220],
      [116.54, 146.83, 174.61],
      [174.61, 220, 261.63],
      [130.81, 164.81, 196],
    ],
    motif: [293.66, 349.23, 392, 440, 523.25, 440, 392, 349.23],
    rhythm: [
      rhythmPattern([0, 8], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 8, 14], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 7, 8], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 6, 8, 14], [4, 10, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
    ],
  },
  {
    roots: [55, 87.31, 65.41, 49], // Am → F → C → G
    chords: [
      [110, 130.81, 164.81],
      [174.61, 220, 261.63],
      [130.81, 164.81, 196],
      [98, 123.47, 146.83],
    ],
    motif: [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63],
    rhythm: [
      rhythmPattern([0, 7, 10], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 6, 11], [3, 12], [2, 5, 8, 10, 14], [0, 4, 6, 8, 12]),
      rhythmPattern([0, 8, 10], [4, 12], [2, 6, 10, 14], [0, 4, 8, 10, 12]),
      rhythmPattern([0, 7, 10, 14], [4, 11], [2, 6, 8, 10, 14], [0, 4, 8, 12]),
    ],
  },
  {
    roots: [82.41, 65.41, 49, 73.42], // Em → C → G → D
    chords: [
      [164.81, 196, 246.94],
      [130.81, 164.81, 196],
      [196, 246.94, 293.66],
      [146.83, 185, 220],
    ],
    motif: [164.81, 196, 220, 246.94, 293.66, 246.94, 220, 196],
    rhythm: [
      rhythmPattern([0, 6, 8, 14], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 4, 8, 11], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 6, 8, 13], [4, 10, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 4, 7, 8, 12, 14], [4, 10, 12], [2, 6, 8, 10, 14], [0, 4, 8, 12]),
    ],
  },
  {
    roots: [65.41, 51.91, 77.78, 58.27], // Cm → Ab → Eb → Bb
    chords: [
      [130.81, 155.56, 196],
      [103.83, 130.81, 155.56],
      [155.56, 196, 233.08],
      [116.54, 146.83, 174.61],
    ],
    motif: [261.63, 311.13, 349.23, 392, 466.16, 392, 349.23, 311.13],
    rhythm: [
      rhythmPattern([0, 10], [8], [4, 12], [0, 8]),
      rhythmPattern([0, 7, 10], [8, 14], [4, 10, 12], [0, 8, 12]),
      rhythmPattern([0, 10], [6, 14], [2, 8, 12], [0, 6, 10, 14]),
      rhythmPattern([0, 8, 10], [8, 14], [4, 10, 12, 14], [0, 8, 12]),
    ],
  },
  {
    roots: [49, 77.78, 58.27, 87.31], // Gm → Eb → Bb → F
    chords: [
      [98, 116.54, 146.83],
      [155.56, 196, 233.08],
      [116.54, 146.83, 174.61],
      [174.61, 220, 261.63],
    ],
    motif: [196, 233.08, 261.63, 293.66, 349.23, 293.66, 261.63, 233.08],
    rhythm: [
      rhythmPattern([0, 4, 8, 12], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 6, 8, 14], [4, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 4, 7, 8, 12], [4, 10, 12], [2, 6, 10, 14], [0, 4, 8, 12]),
      rhythmPattern([0, 6, 8, 11, 14], [4, 12], [2, 6, 8, 10, 14], [0, 4, 8, 12]),
    ],
  },
];
let musicThemeIndex = 0;

function duckMusic() {
  if (!ctx || !musicDuckGain || musicPaused || !enabled || adMuted || document.hidden) return;
  const now = ctx.currentTime;
  const gain = musicDuckGain.gain;
  gain.cancelScheduledValues(now);
  gain.setTargetAtTime(0.34, now, 0.018);
  gain.setTargetAtTime(1, now + 0.14, 0.2);
}

function mnoise(dur: number, vol: number, delay = 0, at?: number) {
  const c = getCtx();
  if (!c || !musicGain) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(musicGain);
  src.start((at ?? c.currentTime) + delay);
}

/** Idempotent. Call from a user gesture; AudioContext requires one. */
export function startMusic() {
  const c = getCtx();
  if (!c || !master) return;
  if (!musicGain) {
    musicGain = c.createGain();
    musicGain.gain.value = MUSIC_BASE_GAIN * musicVolume;
    musicIntensityGain = c.createGain();
    musicIntensityGain.gain.value = 1;
    musicDuckGain = c.createGain();
    musicDuckGain.gain.value = 1;
    musicDuckGain.connect(master);
    musicIntensityGain.connect(musicDuckGain);
    musicGain.connect(musicIntensityGain);
  }
  if (musicTimer !== null) return;
  musicStep = 0;
  musicNextTime = c.currentTime + MUSIC_LOOKAHEAD_SECONDS / 2;
  musicPaused = false;
  musicIntensity = 0;
  musicIntensityTarget = 0;
  musicTimer = window.setInterval(musicTick, MUSIC_TICK_MS);
}

export function setAudioVolumes(music: number, effects: number) {
  musicVolume = Math.max(0, Math.min(1, Number.isFinite(music) ? music : 1));
  effectsVolume = Math.max(0, Math.min(1, Number.isFinite(effects) ? effects : 1));
  if (!ctx) return;
  const now = ctx.currentTime;
  if (musicGain) {
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(MUSIC_BASE_GAIN * musicVolume, now, 0.035);
  }
  if (sfxGain) {
    sfxGain.gain.cancelScheduledValues(now);
    sfxGain.gain.setTargetAtTime(effectsVolume, now, 0.025);
  }
}

export function stopMusic() {
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
  musicPaused = false;
  musicStep = 0;
  musicNextTime = 0;
  musicIntensity = 0;
  musicIntensityTarget = 0;
  if (ctx && musicIntensityGain) {
    const now = ctx.currentTime;
    musicIntensityGain.gain.cancelScheduledValues(now);
    musicIntensityGain.gain.setTargetAtTime(1, now, 0.05);
  }
}

export function setMusicPaused(paused: boolean) {
  musicPaused = paused;
  if (!paused && ctx && musicTimer !== null) musicNextTime = ctx.currentTime + MUSIC_LOOKAHEAD_SECONDS / 2;
}

export function setMusicIntensity(intensity: number) {
  musicIntensityTarget = Math.max(0, Math.min(1, intensity));
}

export function setMusicTheme(floorIndex: number) {
  musicThemeIndex = Number.isInteger(floorIndex) ? Math.max(0, Math.min(MUSIC_THEMES.length - 1, floorIndex)) : 0;
}

function musicTone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, at?: number) {
  const c = getCtx();
  if (!c || !musicGain) return;
  const t0 = at ?? c.currentTime;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function musicTick() {
  // Never backfill missed notes; resume on the next live beat after any interruption.
  if (!ctx) return;
  if (!enabled || adMuted || musicPaused || document.hidden) {
    musicNextTime = ctx.currentTime + MUSIC_STEP_SECONDS;
    return;
  }
  const c = getCtx();
  if (!c) return;
  if (c.state !== "running") {
    musicNextTime = c.currentTime + MUSIC_STEP_SECONDS;
    return;
  }

  const now = c.currentTime;
  if (musicNextTime < now - MUSIC_LOOKAHEAD_SECONDS) {
    const missed = Math.floor((now - musicNextTime) / MUSIC_STEP_SECONDS) + 1;
    musicStep += missed;
    musicNextTime += missed * MUSIC_STEP_SECONDS;
  }
  const scheduleUntil = now + MUSIC_LOOKAHEAD_SECONDS;
  while (musicNextTime < scheduleUntil) {
    scheduleMusicStep(musicNextTime);
    musicStep++;
    musicNextTime += MUSIC_STEP_SECONDS;
  }
}

function scheduleMusicStep(at: number) {
  musicIntensity += (musicIntensityTarget - musicIntensity) * 0.12;
  if (musicIntensityGain) {
    musicIntensityGain.gain.setTargetAtTime(1 + musicIntensity * 0.45, at, 0.08);
  }
  const loopStep = musicStep % (MUSIC_PHRASE_STEPS * MUSIC_LOOP_PHRASES);
  const phrase = Math.floor(loopStep / MUSIC_PHRASE_STEPS);
  const s = loopStep % MUSIC_PHRASE_STEPS;
  const responsePhrase = phrase % 2 === 1;
  const bar = Math.floor(s / 16);
  const beat = s % 16;
  const theme = MUSIC_THEMES[musicThemeIndex] ?? MUSIC_THEMES[0]!;
  const harmonyBar = (bar + phrase) % 4;
  const root = theme.roots[harmonyBar] ?? theme.roots[0]!;
  const chord = theme.chords[harmonyBar] ?? theme.chords[0]!;
  const rhythm = theme.rhythm[harmonyBar] ?? theme.rhythm[0]!;
  const hits = (mask: number) => (mask & (1 << beat)) !== 0;

  // Four-bar phrase: grounded bass, a clear backbeat, and restrained offbeat hats.
  // A quiet chord bed gives the loop harmonic body without masking combat effects.
  if (beat === 0) {
    for (const freq of chord) musicTone(freq, 0.72, "sine", 0.009, undefined, at);
  }
  if (hits(rhythm.bass)) {
    const bass = beat === 12 ? root * 0.75 : root;
    musicTone(bass, 0.2, "triangle", 0.075, bass * 0.96, at);
  }
  const phraseKick = responsePhrase && bar === 3 && beat === 14;
  if (hits(rhythm.kick) || phraseKick) musicTone(92, 0.16, "sine", 0.12, 42, at);
  if (hits(rhythm.snare)) {
    mnoise(0.14, 0.065, 0, at);
    musicTone(190, 0.1, "triangle", 0.035, 92, at);
  }
  if (hits(rhythm.hats)) mnoise(0.035, 0.012 + musicIntensity * 0.008, 0, at);

  // Short motif repeats across the chord change; it remains below combat effects.
  const motifSlot = bar * 2 + (beat >= 8 ? 1 : 0);
  const phraseOffset = [0, 3, 5, 2][phrase] ?? 0;
  const mainMotifBeat = beat === 0 || beat === 6 || beat === 8 || beat === 14;
  const answerMotifBeat = responsePhrase && (bar === 1 || bar === 3) && (beat === 2 || beat === 10);
  if (mainMotifBeat || answerMotifBeat) {
    const offset = phraseOffset + (answerMotifBeat ? 3 : 0);
    const note = theme.motif[(motifSlot + offset) % theme.motif.length];
    if (note !== undefined) musicTone(note, 0.22, "triangle", 0.035, undefined, at);
  }

  // Four alternating phrases rotate harmony and motif over a 35.84s cue.
  // One B1 run therefore completes almost one full musical cycle before the loop returns.
  if (responsePhrase && bar === 3 && beat === 14) {
    musicTone(root * 1.5, 0.14, "triangle", 0.032, undefined, at);
  }
  if (responsePhrase && bar === 3 && (beat === 13 || beat === 15)) {
    mnoise(0.035, 0.012 + musicIntensity * 0.004, 0, at);
  }

  // Add a clear octave answer as pursuit pressure builds; note stays in the floor motif's key.
  if (musicIntensity > 0.22 && (beat === 6 || beat === 14)) {
    const answerNote = theme.motif[(motifSlot + phraseOffset + 3) % theme.motif.length];
    if (answerNote !== undefined) musicTone(answerNote * 2, 0.18, "sine", 0.02 + musicIntensity * 0.035, undefined, at);
  }
  if (musicIntensity > 0.68 && beat === 14) mnoise(0.08, 0.025, 0, at);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
  const c = getCtx();
  if (!c || !sfxGain) return;
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
  gain.connect(sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, vol: number, delay = 0) {
  const c = getCtx();
  if (!c || !sfxGain) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(sfxGain);
  src.start(c.currentTime + delay);
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
    applyGain();
  },
  /** Portal requirement: silence all audio while an ad is playing. */
  setAdMuted(m: boolean) {
    adMuted = m;
    applyGain();
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
    duckMusic();
    tone(180, 0.18, "sawtooth", 0.09, 60);
    noise(0.12, 0.08);
  },
  combo(streak: number) {
    duckMusic();
    const notes = [587.33, 698.46, 880, 1174.66]; // D5 → F5 → A5 → D6
    const note = notes[Math.max(0, Math.min(notes.length - 1, Math.floor(streak / 2) - 1))]!;
    tone(note * 0.75, 0.11, "triangle", 0.045);
    tone(note, 0.18, "sine", 0.065, undefined, 0.075);
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
    duckMusic();
    tone(90, 0.7, "sawtooth", 0.13, 40);
    tone(140, 0.6, "square", 0.05, 60);
    noise(0.5, 0.06);
  },
  tidalSurge() {
    duckMusic();
    tone(176, 0.42, "sine", 0.055, 440);
    tone(92, 0.38, "triangle", 0.075, 54, 0.04);
    noise(0.26, 0.045, 0.02);
  },
  forgeImpact(hit: boolean) {
    duckMusic();
    tone(hit ? 118 : 164, hit ? 0.36 : 0.24, "triangle", hit ? 0.085 : 0.055, hit ? 52 : 86);
    noise(hit ? 0.22 : 0.14, hit ? 0.075 : 0.045);
  },
  abyssEcho() {
    duckMusic();
    tone(340, 0.58, "sine", 0.055, 760);
    tone(180, 0.46, "triangle", 0.04, 92, 0.08);
    noise(0.42, 0.025, 0.03);
  },
  abyssSnap() {
    tone(720, 0.16, "sine", 0.06, 260);
    tone(120, 0.18, "triangle", 0.05, 70, 0.025);
  },
  cathedralBell() {
    tone(783.99, 1.1, "sine", 0.075, 740);
    tone(1174.66, 0.82, "sine", 0.04, 1100, 0.12);
    tone(392, 0.48, "triangle", 0.035, 330, 0.04);
  },
  cathedralResonance() {
    tone(987.77, 0.32, "sine", 0.055, 880);
    tone(1318.51, 0.44, "triangle", 0.038, 1174.66, 0.05);
  },
  bossHurt() {
    duckMusic();
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
