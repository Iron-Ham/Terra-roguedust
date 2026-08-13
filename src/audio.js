const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class AudioSystem {
  constructor(getSettings) {
    this.getSettings = getSettings;
    this.context = null;
    this.master = null;
    this.music = null;
    this.musicStep = 0;
    this.nextBeat = 0;
    this.enabled = false;
  }

  unlock() {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = 0.65;
      this.master.connect(this.context.destination);
      this.nextBeat = this.context.currentTime + 0.08;
    }
    this.context.resume();
    this.enabled = true;
  }

  tone(frequency, duration, options = {}) {
    if (!this.context || !this.enabled) return;
    const { type = 'sine', volume = 0.12, slide = frequency, delay = 0, bus = 'sfx', attack = 0.006 } = options;
    const level = this.getSettings()[bus] ?? 0.5;
    if (!level) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(12, frequency), now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume * level, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration, volume = 0.12, filterFrequency = 900, delay = 0) {
    if (!this.context || !this.enabled || !this.getSettings().sfx) return;
    const now = this.context.currentTime + delay;
    const buffer = this.context.createBuffer(1, Math.ceil(this.context.sampleRate * duration), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(volume * this.getSettings().sfx, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
  }

  event(name) {
    if (!this.enabled) return;
    const events = {
      fire: () => this.tone(240, 0.08, { type: 'triangle', volume: 0.08, slide: 105 }),
      hit: () => { this.tone(90, 0.16, { type: 'sawtooth', volume: 0.12, slide: 42 }); this.noise(0.08, 0.08, 480); },
      enemy: () => { this.tone(150, 0.13, { type: 'square', volume: 0.06, slide: 62 }); this.noise(0.13, 0.08, 1300); },
      pickup: () => this.tone(590, 0.2, { type: 'sine', volume: 0.1, slide: 1010 }),
      dash: () => { this.tone(95, 0.24, { type: 'sawtooth', volume: 0.1, slide: 550 }); this.noise(0.13, 0.06, 1800); },
      boon: () => { [440, 660, 880].forEach((pitch, index) => this.tone(pitch, 0.32, { type: 'sine', volume: 0.08, delay: index * 0.07 })); },
      boss: () => { this.tone(64, 0.65, { type: 'sawtooth', volume: 0.16, slide: 32 }); this.noise(0.5, 0.18, 180); },
      buy: () => { this.tone(330, 0.12, { type: 'triangle', volume: 0.1, slide: 660 }); this.tone(880, 0.2, { type: 'sine', volume: 0.06, delay: 0.08 }); },
      death: () => { this.tone(220, 0.7, { type: 'sawtooth', volume: 0.17, slide: 22 }); this.noise(0.55, 0.16, 250); },
    };
    events[name]?.();
  }

  update(active) {
    if (!this.context || !this.enabled) return;
    const settings = this.getSettings();
    if (!active || settings.music <= 0) {
      this.nextBeat = this.context.currentTime + 0.15;
      return;
    }
    const beat = 60 / 118 / 2;
    const now = this.context.currentTime;
    while (this.nextBeat < now + 0.1) {
      const scale = [110, 0, 165, 0, 146.83, 0, 196, 0, 130.81, 0, 164.81, 0, 146.83, 0, 220, 0];
      const step = this.musicStep % scale.length;
      const bass = scale[step];
      if (bass) this.tone(bass, beat * 0.92, { type: 'triangle', volume: step % 4 === 0 ? 0.1 : 0.055, slide: bass * 0.99, delay: this.nextBeat - now, bus: 'music', attack: 0.015 });
      if (step % 4 === 2) this.tone(660, 0.1, { type: 'sine', volume: 0.035, slide: 990, delay: this.nextBeat - now, bus: 'music' });
      if (step % 8 === 0) this.noise(0.055, 0.025 * settings.music, 3500, this.nextBeat - now);
      this.musicStep += 1;
      this.nextBeat += beat;
    }
  }
}
