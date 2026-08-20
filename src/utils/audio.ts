// Synthesized Web Audio sound effects for Yan Ken Po

class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public playClick() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  public playSelect() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(659.25, this.ctx.currentTime + 0.08); // E5

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playChantBeat(step: number) {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const freqs = [330, 440, 660]; // Yan (low), Ken (mid), Po (high punch)
    const freq = freqs[step % freqs.length] || 440;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = step === 2 ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (step === 2 ? 0.25 : 0.15));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + (step === 2 ? 0.25 : 0.15));
  }

  public playWin() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.08);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + index * 0.08);
      osc.stop(this.ctx.currentTime + index * 0.08 + 0.25);
    });
  }

  public playLose() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 392, 330, 261.63]; // A4, G4, E4, C4 (descending)
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.1);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime + index * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + index * 0.1);
      osc.stop(this.ctx.currentTime + index * 0.1 + 0.2);
    });
  }

  public playDraw() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 440];
    notes.forEach((freq, index) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + index * 0.12);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + index * 0.12 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + index * 0.12);
      osc.stop(this.ctx.currentTime + index * 0.12 + 0.15);
    });
  }

  public playPop() {
    if (this.muted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }
}

export const sounds = new SoundManager();
