/**
 * Web Audio API procedural sound engine for Tashkent Street Racer.
 * Generates dynamic engine revs, tire skids, nitro whoosh, crash impacts, horn, and racing synth music.
 */

class SoundManagerClass {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.5;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning: boolean = false;

  // Tire skid nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;

  // Nitro sound nodes
  private nitroGain: GainNode | null = null;

  // Music sequencer
  private isMusicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sound: number, music: number) {
    this.soundVolume = Math.max(0, Math.min(1, sound));
    this.musicVolume = Math.max(0, Math.min(1, music));
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setValueAtTime(0.18 * this.soundVolume, this.ctx.currentTime);
    }
  }

  public startEngine() {
    try {
      this.initCtx();
      if (!this.ctx || this.isEngineRunning) return;

      const now = this.ctx.currentTime;

      // Base engine oscillator (low growl)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(55, now); // Idle ~800 RPM

      // Harmonic oscillator (cylinder pops)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(110, now);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.18 * this.soundVolume, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Audio init error:', e);
    }
  }

  public updateEnginePitch(speedKmh: number, rpmNorm: number, isNitro: boolean) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;

    try {
      const now = this.ctx.currentTime;
      // Base idle is 55 Hz, revs up to ~280 Hz per gear
      const targetFreq = 55 + rpmNorm * 180 + (isNitro ? 35 : 0);
      this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * 1.5, now, 0.05);

      // Lowpass opens up as throttle increases
      const filterFreq = 400 + rpmNorm * 1800 + (speedKmh * 3);
      this.engineFilter.frequency.setTargetAtTime(Math.min(3200, filterFreq), now, 0.05);
    } catch {
      // Ignored
    }
  }

  public stopEngine() {
    try {
      if (this.engineOsc1) {
        this.engineOsc1.stop();
        this.engineOsc1.disconnect();
        this.engineOsc1 = null;
      }
      if (this.engineOsc2) {
        this.engineOsc2.stop();
        this.engineOsc2.disconnect();
        this.engineOsc2 = null;
      }
      this.isEngineRunning = false;
    } catch {
      // Ignored
    }
  }

  public playTireSkid(isSkidding: boolean, intensity: number = 0.5) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      if (isSkidding) {
        if (!this.skidGain) {
          // White noise buffer for tire friction
          const bufferSize = this.ctx.sampleRate * 2;
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
          filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
          filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

          this.skidGain = this.ctx.createGain();
          this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

          noise.connect(filter);
          filter.connect(this.skidGain);
          this.skidGain.connect(this.ctx.destination);
          noise.start();
          this.skidNode = noise;
        }

        const targetVol = Math.min(0.25, intensity * 0.25) * this.soundVolume;
        this.skidGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.08);
      } else if (this.skidGain) {
        this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    } catch {
      // Ignored
    }
  }

  public playNitro(active: boolean) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      if (active) {
        if (!this.nitroGain) {
          // Deep woosh noise
          const bufferSize = this.ctx.sampleRate;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
          }

          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(900, this.ctx.currentTime);

          this.nitroGain = this.ctx.createGain();
          this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

          noise.connect(filter);
          filter.connect(this.nitroGain);
          this.nitroGain.connect(this.ctx.destination);
          noise.start();
        }

        this.nitroGain.gain.setTargetAtTime(0.3 * this.soundVolume, this.ctx.currentTime, 0.05);
      } else if (this.nitroGain) {
        this.nitroGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      }
    } catch {
      // Ignored
    }
  }

  public playCrash(speedImpact: number) {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const now = this.ctx.currentTime;
      // Low thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.35);

      const vol = Math.min(0.6, (speedImpact / 100) * 0.5) * this.soundVolume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Ignored
    }
  }

  public playHorn() {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const now = this.ctx.currentTime;
      // Dual tone classic European/Uzbek car horn (420Hz + 500Hz)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.setValueAtTime(420, now);
      osc2.frequency.setValueAtTime(510, now);

      gain.gain.setValueAtTime(0.25 * this.soundVolume, now);
      gain.gain.setValueAtTime(0.25 * this.soundVolume, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch {
      // Ignored
    }
  }

  public playCheckpoint() {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.3 * this.soundVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Ignored
    }
  }

  public playFinishVictory() {
    this.initCtx();
    if (!this.ctx || this.soundVolume <= 0) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.12;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.25 * this.soundVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      });
    } catch {
      // Ignored
    }
  }

  /**
   * Energetic racing synth background music generator (cyberpunk / driving synthwave bassline)
   */
  public startMusic() {
    if (this.isMusicPlaying || this.musicVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    this.isMusicPlaying = true;
    const bassline = [110, 110, 130.81, 146.83, 110, 110, 98, 123.47]; // A, A, C, D, A, A, G, B
    const tempoMs = 135; // ~135 BPM 16th feel

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.isMusicPlaying || this.musicVolume <= 0) return;
      try {
        const now = this.ctx.currentTime;
        const note = bassline[this.musicStep % bassline.length];

        // Bass synth pulse
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 + (this.musicStep % 4 === 0 ? 300 : 0), now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.12);

        gain.gain.setValueAtTime(0.12 * this.musicVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);

        // Hi-hat noise on 16ths
        if (this.musicStep % 2 === 1) {
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          hatOsc.type = 'triangle';
          hatOsc.frequency.setValueAtTime(8000, now);
          hatGain.gain.setValueAtTime(0.03 * this.musicVolume, now);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

          hatOsc.connect(hatGain);
          hatGain.connect(this.ctx.destination);
          hatOsc.start(now);
          hatOsc.stop(now + 0.05);
        }

        this.musicStep = (this.musicStep + 1) % 64;
      } catch {
        // Ignored
      }
    }, tempoMs);
  }

  public stopMusic() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public stopAll() {
    this.stopEngine();
    this.stopMusic();
    this.playTireSkid(false);
    this.playNitro(false);
  }
}

export const SoundManager = new SoundManagerClass();
