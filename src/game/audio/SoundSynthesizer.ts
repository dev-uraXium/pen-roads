import { AudioSettings } from '../../types/game';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    masterVolume: 0.8,
    engineVolume: 0.7,
    sfxVolume: 0.8,
    ambienceVolume: 0.6,
    muted: false,
  };

  // Engine audio nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private isEngineRunning: boolean = false;

  // Rain ambience nodes
  private rainNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;

  // Skid sound
  private skidGain: GainNode | null = null;
  private skidNode: AudioNode | null = null;

  // Horn
  private hornGain: GainNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private isHonking: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init(): void {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch {
      // Audio not supported
    }
  }

  public ensureContext(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return !!this.ctx;
  }

  public updateSettings(settings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (this.engineGain && this.ctx) {
      const effectiveVol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.engineVolume;
      this.engineGain.gain.setValueAtTime(effectiveVol, this.ctx.currentTime);
    }
    if (this.rainGain && this.ctx) {
      const effectiveRain = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.ambienceVolume;
      this.rainGain.gain.setValueAtTime(effectiveRain, this.ctx.currentTime);
    }
  }

  // Engine audio loop
  public startEngine(vehicleType: string = 'car'): void {
    if (!this.ensureContext() || this.isEngineRunning || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.engineGain = this.ctx.createGain();
      const vol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.engineVolume;
      this.engineGain.gain.setValueAtTime(vol, now);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(500, now);

      // Main engine tone
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = vehicleType === 'truck' || vehicleType === 'bus' ? 'sawtooth' : 'triangle';
      this.engineOsc1.frequency.setValueAtTime(45, now);

      // Engine harmonic
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'sawtooth';
      this.engineOsc2.frequency.setValueAtTime(90, now);

      // Low end rumble
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'sine';
      this.engineSubOsc.frequency.setValueAtTime(30, now);

      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.5, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineSubOsc.connect(subGain);
      subGain.connect(this.engineFilter);

      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSubOsc.start();

      this.isEngineRunning = true;
    } catch {
      // Audio node failure
    }
  }

  public updateEnginePitch(speedRatio: number, throttle: number, vehicleType: string = 'car'): void {
    if (!this.isEngineRunning || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    const baseFreq = vehicleType === 'truck' || vehicleType === 'bus' ? 32 : vehicleType === 'motorbike' ? 65 : 45;
    const maxFreq = vehicleType === 'motorbike' ? 240 : vehicleType === 'truck' ? 120 : 180;

    // Smooth RPM curve with gear shifts illusion
    const gearProgress = (speedRatio * 4) % 1;
    const rpmPitch = baseFreq + gearProgress * (maxFreq - baseFreq) * 0.7 + speedRatio * 40 + throttle * 25;

    const now = this.ctx.currentTime;
    this.engineOsc1.frequency.setTargetAtTime(rpmPitch, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(rpmPitch * 1.5, now, 0.08);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(rpmPitch * 0.5, now, 0.08);
    }

    // Filter frequency opens up with throttle
    const filterFreq = 400 + throttle * 1200 + speedRatio * 800;
    this.engineFilter.frequency.setTargetAtTime(filterFreq, now, 0.08);
  }

  public stopEngine(): void {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc1?.disconnect();
      this.engineOsc2?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // Ignore
    }
    this.isEngineRunning = false;
  }

  // Horn
  public startHorn(): void {
    if (!this.ensureContext() || this.isHonking || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      this.hornGain = this.ctx.createGain();
      const vol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.sfxVolume * 0.4;
      this.hornGain.gain.setValueAtTime(vol, now);

      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc1.type = 'sawtooth';
      this.hornOsc1.frequency.setValueAtTime(370, now);

      this.hornOsc2 = this.ctx.createOscillator();
      this.hornOsc2.type = 'sawtooth';
      this.hornOsc2.frequency.setValueAtTime(466, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);

      this.hornOsc1.connect(filter);
      this.hornOsc2.connect(filter);
      filter.connect(this.hornGain);
      this.hornGain.connect(this.ctx.destination);

      this.hornOsc1.start();
      this.hornOsc2.start();
      this.isHonking = true;
    } catch {
      // Ignore
    }
  }

  public stopHorn(): void {
    if (!this.isHonking) return;
    try {
      this.hornOsc1?.stop();
      this.hornOsc2?.stop();
      this.hornOsc1?.disconnect();
      this.hornOsc2?.disconnect();
      this.hornGain?.disconnect();
    } catch {
      // Ignore
    }
    this.isHonking = false;
  }

  // Tire skid screech
  public playTireSkid(intensity: number): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;

    if (!this.skidGain) {
      // Create white noise buffer
      const bufferSize = this.ctx.sampleRate * 1;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, this.ctx.currentTime);
      filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.skidGain);
      this.skidGain.connect(this.ctx.destination);
      noise.start();
      this.skidNode = noise;
    }

    const targetGain = Math.min(1, Math.max(0, intensity)) * this.settings.masterVolume * this.settings.sfxVolume * 0.35;
    this.skidGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
  }

  public stopTireSkid(): void {
    if (this.skidGain && this.ctx) {
      this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
  }

  // Bus door pneumatic air release + latch
  public playBusDoors(isOpen: boolean): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume;

    // Pneumatic hiss
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.2));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOpen ? 2200 : 1800, now);
    filter.Q.setValueAtTime(1.5, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    // Tone chime
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isOpen ? 587.33 : 440.0, now + 0.1); // D5 or A4
    oscGain.gain.setValueAtTime(vol * 0.25, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now + 0.1);
    osc.stop(now + 0.5);
  }

  // Bus ticket validation stamp & chime
  public playTicketIssued(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume;

    // Punch click
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'square';
    clickOsc.frequency.setValueAtTime(180, now);
    clickGain.gain.setValueAtTime(vol * 0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    clickOsc.connect(clickGain);
    clickGain.connect(this.ctx.destination);
    clickOsc.start(now);
    clickOsc.stop(now + 0.07);

    // Cheerful double chime (E5 -> G#5)
    [659.25, 830.61].forEach((freq, idx) => {
      if (!this.ctx) return;
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(freq, now + 0.05 + idx * 0.08);

      chimeGain.gain.setValueAtTime(vol * 0.35, now + 0.05 + idx * 0.08);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + idx * 0.08);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chimeOsc.start(now + 0.05 + idx * 0.08);
      chimeOsc.stop(now + 0.4 + idx * 0.08);
    });
  }

  // Passenger boarding greeting
  public playPassengerBoarded(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume;

    // Door close clunk
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);

    // Soft chime
    const chime = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chime.type = 'sine';
    chime.frequency.setValueAtTime(523.25, now + 0.08); // C5
    chimeGain.gain.setValueAtTime(vol * 0.25, now + 0.08);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    chime.connect(chimeGain);
    chimeGain.connect(this.ctx.destination);
    chime.start(now + 0.08);
    chime.stop(now + 0.42);
  }

  // Cargo loaded / unloaded
  public playCargoAction(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume;

    // Heavy crate thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

    gain.gain.setValueAtTime(vol * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Collision bump
  public playCrash(speedRatio: number): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(1, speedRatio) * this.settings.masterVolume * this.settings.sfxVolume;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);

    gain.gain.setValueAtTime(vol * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Job complete reward celebration
  public playJobRewardFanfare(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.45;

    // Arpeggio notes: C5, E5, G5, C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);

      const noteDuration = idx === notes.length - 1 ? 0.6 : 0.2;
      gain.gain.setValueAtTime(vol, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + noteDuration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + noteDuration + 0.05);
    });
  }

  // Rain ambience
  public startRainAmbience(): void {
    if (!this.ensureContext() || !this.ctx || this.rainNode) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02; // Pink noise
        lastOut = data[i];
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      const vol = this.settings.muted ? 0 : this.settings.masterVolume * this.settings.ambienceVolume * 0.25;
      this.rainGain.gain.setValueAtTime(vol, this.ctx.currentTime);

      noise.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);
      noise.start();
      this.rainNode = noise;
    } catch {
      // Ignore
    }
  }

  public stopRainAmbience(): void {
    if (this.rainNode) {
      try {
        (this.rainNode as AudioScheduledSourceNode).stop();
        this.rainNode.disconnect();
        this.rainGain?.disconnect();
      } catch {
        // Ignore
      }
      this.rainNode = null;
      this.rainGain = null;
    }
  }

  // Thunder rumble
  public playThunder(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.ambienceVolume * 0.5;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(30, now + 1.5);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 2.3);
  }

  // Bike courier high-speed traffic near-miss whoosh
  public playNearMiss(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.45;

    // Filtered noise sweep + high chime
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.28);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  // Valid transit pass scan
  public playTicketValid(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.35;

    [880, 1318.5].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(vol, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.13);
    });
  }

  // Fare dodger caught penalty buzzer & fine collected
  public playTicketDodgerCaught(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.4;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(196, now);
    osc.frequency.setValueAtTime(164, now + 0.1);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.29);
  }

  // Passenger speech bubble audio feedback
  public playPassengerSpeech(mood: 'happy' | 'neutral' | 'annoyed' | 'panicked'): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.25;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';

    if (mood === 'happy') {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.15);
    } else if (mood === 'annoyed' || mood === 'panicked') {
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(210, now + 0.15);
    } else {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(480, now + 0.12);
    }

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Truck Jackknife warning tone
  public playTrailerJackknifeWarning(): void {
    if (!this.ensureContext() || !this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    const vol = this.settings.masterVolume * this.settings.sfxVolume * 0.3;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, now);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

export const soundSynth = new SoundSynthesizer();
