// audio.js — every sound in BLOOMWARD is synthesised with WebAudio:
// plucked notes for shots, a soft thock for planting, a low buzz when a
// pest reaches the Bloom, little arpeggios for victories, and a gentle
// ambient pluck loop under it all. No audio files, no network.

let ctx = null;
let master = null;
let ambientTimer = null;
let step = 0;

export const audio = {
  muted: false,

  // Must be called from a user gesture at least once.
  init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      this.startAmbient();
    } catch (err) {
      ctx = null;
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    if (master) master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  // One oscillator note with a quick envelope. `type` and slide optional.
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = 0) {
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  noise(dur, vol = 0.15, when = 0, freq = 1200) {
    if (!ctx || this.muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  },

  shoot(kind) {
    if (kind === 'stormspire') {
      this.noise(0.12, 0.16, 0, 2600);
      this.tone(880, 0.1, 'sawtooth', 0.05, 0, 220);
    } else if (kind === 'bombard') {
      this.tone(160, 0.18, 'sine', 0.22, 0, 60);
    } else if (kind === 'frostbell') {
      this.tone(1240, 0.16, 'sine', 0.1);
      this.tone(1860, 0.2, 'sine', 0.06, 0.03);
    } else if (kind === 'thornvine') {
      this.noise(0.05, 0.08, 0, 3400);
    } else {
      this.tone(660 + Math.random() * 120, 0.08, 'triangle', 0.1, 0, 440);
    }
  },

  explosion() {
    this.noise(0.25, 0.22, 0, 500);
    this.tone(110, 0.25, 'sine', 0.2, 0, 45);
  },

  place() {
    this.tone(190, 0.12, 'sine', 0.3, 0, 90);
    this.noise(0.06, 0.1, 0, 700);
    this.tone(520, 0.1, 'triangle', 0.12, 0.05);
  },

  upgrade() {
    this.tone(523, 0.1, 'triangle', 0.14);
    this.tone(659, 0.1, 'triangle', 0.14, 0.07);
    this.tone(784, 0.16, 'triangle', 0.16, 0.14);
  },

  sell() {
    this.tone(784, 0.09, 'triangle', 0.12);
    this.tone(587, 0.14, 'triangle', 0.12, 0.06);
  },

  denied() {
    this.tone(196, 0.14, 'square', 0.08);
    this.tone(185, 0.16, 'square', 0.08, 0.09);
  },

  gold() {
    this.tone(1320, 0.06, 'sine', 0.05);
  },

  leak() {
    this.tone(220, 0.3, 'sawtooth', 0.16, 0, 110);
    this.noise(0.2, 0.12, 0, 300);
  },

  boss() {
    this.tone(98, 0.5, 'sawtooth', 0.2, 0, 65);
    this.tone(147, 0.5, 'sawtooth', 0.14, 0.08, 98);
    this.noise(0.4, 0.1, 0, 240);
  },

  waveClear() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.13, i * 0.08));
  },

  victory() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, 0.24, 'triangle', 0.15, i * 0.13));
  },

  defeat() {
    const notes = [392, 370, 349, 311];
    notes.forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, i * 0.16));
  },

  // A slow pentatonic pluck pattern, quiet enough to sit under play.
  startAmbient() {
    if (!ctx || ambientTimer) return;
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    ambientTimer = setInterval(() => {
      if (!ctx || this.muted || ctx.state !== 'running') return;
      step++;
      if (step % 2 === 0) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        this.tone(f, 0.5, 'sine', 0.035);
        if (Math.random() < 0.3) this.tone(f * 2, 0.4, 'sine', 0.02, 0.12);
      }
    }, 420);
  },
};
