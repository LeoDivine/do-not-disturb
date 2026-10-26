/**
 * Web Audio API Sound Synthesizer
 * Provides offline-capable, synthetic ambient soundscapes (Gentle Rain, Focus Beats, Deep Space)
 * and an acoustic session-ending meditation bell / chime.
 */

export type AcousticPreset = "rain" | "binaural" | "space";

export interface PresetInfo {
  id: AcousticPreset;
  name: string;
  subtitle: string;
  description: string;
}

export const ACOUSTIC_PRESETS: Record<AcousticPreset, PresetInfo> = {
  rain: {
    id: "rain",
    name: "Gentle Rain",
    subtitle: "Rain Canopy",
    description: "Cozy, soothing rain sounds",
  },
  binaural: {
    id: "binaural",
    name: "Focus Beats",
    subtitle: "Binaural 40Hz",
    description: "Gentle rhythm to help focus",
  },
  space: {
    id: "space",
    name: "Deep Space",
    subtitle: "Cosmic Drone",
    description: "Warm sound to mask room noise",
  },
};

interface ActiveSoundNodes {
  masterGain: GainNode;
  stopNodes: () => void;
}

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private activePreset: AcousticPreset | null = null;
  private activeNodes: ActiveSoundNodes | null = null;
  private currentVolumePercent: number = 65;

  private getContext(): AudioContext {
    if (typeof window === "undefined") {
      throw new Error("Web Audio API is only available in browser environments");
    }

    if (!this.ctx || this.ctx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch((err) => {
        console.warn("Could not resume AudioContext:", err);
      });
    }

    return this.ctx;
  }

  /**
   * Generates a 2-second looped pink noise buffer (Paul Kellet's algorithm)
   */
  private createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.153852;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    }

    return buffer;
  }

  /**
   * Generates a 2-second looped brownian (red) noise buffer for deep warm rumble
   */
  private createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.4; // Boost warm level
    }

    return buffer;
  }

  /**
   * Synthesizes Gentle Rain
   */
  private buildRainNodes(ctx: AudioContext, masterGain: GainNode): () => void {
    const noiseBuffer = this.createPinkNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Filter simulating rain falling on canopy
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(680, ctx.currentTime);

    // Subtle 432Hz sine undertone for cozy ambient warmth
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(432, ctx.currentTime);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.015, ctx.currentTime);
    osc.connect(oscGain);

    noiseSource.connect(filter);
    filter.connect(masterGain);
    oscGain.connect(masterGain);

    noiseSource.start();
    osc.start();

    return () => {
      try {
        noiseSource.stop();
        osc.stop();
        noiseSource.disconnect();
        filter.disconnect();
        osc.disconnect();
        oscGain.disconnect();
      } catch {}
    };
  }

  /**
   * Synthesizes Focus Beats (Binaural pulse + rhythmic focus drone)
   */
  private buildBinauralNodes(ctx: AudioContext, masterGain: GainNode): () => void {
    // Carrier frequencies: Left 216Hz, Right 226Hz (10Hz alpha wave difference for relaxed focus)
    const leftOsc = ctx.createOscillator();
    leftOsc.type = "sine";
    leftOsc.frequency.setValueAtTime(216, ctx.currentTime);

    const rightOsc = ctx.createOscillator();
    rightOsc.type = "sine";
    rightOsc.frequency.setValueAtTime(226, ctx.currentTime);

    // Sub harmonic drone at 108Hz
    const subOsc = ctx.createOscillator();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(108, ctx.currentTime);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.04, ctx.currentTime);
    subOsc.connect(subGain);

    // Gentle rhythmic pulse via LFO (0.25 Hz = 15 bpm calm breathing cycle)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.25, ctx.currentTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);
    lfo.connect(lfoGain.gain);

    const oscMixGain = ctx.createGain();
    oscMixGain.gain.setValueAtTime(0.22, ctx.currentTime);

    // Panning nodes if supported
    let leftPanner: AudioNode = leftOsc;
    let rightPanner: AudioNode = rightOsc;

    if (typeof ctx.createStereoPanner === "function") {
      const pannerL = ctx.createStereoPanner();
      pannerL.pan.setValueAtTime(-0.8, ctx.currentTime);
      leftOsc.connect(pannerL);
      leftPanner = pannerL;

      const pannerR = ctx.createStereoPanner();
      pannerR.pan.setValueAtTime(0.8, ctx.currentTime);
      rightOsc.connect(pannerR);
      rightPanner = pannerR;
    }

    leftPanner.connect(oscMixGain);
    rightPanner.connect(oscMixGain);
    subGain.connect(oscMixGain);

    // Filter to keep tones velvety and comfortable
    const toneFilter = ctx.createBiquadFilter();
    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(450, ctx.currentTime);

    oscMixGain.connect(toneFilter);
    toneFilter.connect(masterGain);

    // Also add subtle warm background filtered noise
    const noiseBuffer = this.createPinkNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(320, ctx.currentTime);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    leftOsc.start();
    rightOsc.start();
    subOsc.start();
    lfo.start();
    noiseSource.start();

    return () => {
      try {
        leftOsc.stop();
        rightOsc.stop();
        subOsc.stop();
        lfo.stop();
        noiseSource.stop();
        leftOsc.disconnect();
        rightOsc.disconnect();
        subOsc.disconnect();
        lfo.disconnect();
        noiseSource.disconnect();
        masterGain.disconnect();
      } catch {}
    };
  }

  /**
   * Synthesizes Deep Space (Brownian noise + resonant low cosmic drone)
   */
  private buildSpaceNodes(ctx: AudioContext, masterGain: GainNode): () => void {
    // Brownian noise base for deep planetary rumble
    const brownBuffer = this.createBrownNoiseBuffer(ctx);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = brownBuffer;
    noiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(260, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.8, ctx.currentTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(masterGain);

    // Deep sub-bass drones: 55Hz (A1) and 110Hz (A2)
    const subOsc1 = ctx.createOscillator();
    subOsc1.type = "sine";
    subOsc1.frequency.setValueAtTime(55, ctx.currentTime);
    const subGain1 = ctx.createGain();
    subGain1.gain.setValueAtTime(0.08, ctx.currentTime);
    subOsc1.connect(subGain1);
    subGain1.connect(masterGain);

    const subOsc2 = ctx.createOscillator();
    subOsc2.type = "sine";
    subOsc2.frequency.setValueAtTime(110.2, ctx.currentTime); // Slight detune for celestial shimmer
    const subGain2 = ctx.createGain();
    subGain2.gain.setValueAtTime(0.04, ctx.currentTime);
    subOsc2.connect(subGain2);
    subGain2.connect(masterGain);

    // Very slow modulation filter sweep (0.06 Hz) simulating cosmic expansion
    const filterLfo = ctx.createOscillator();
    filterLfo.type = "sine";
    filterLfo.frequency.setValueAtTime(0.06, ctx.currentTime);
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(60, ctx.currentTime);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(noiseFilter.frequency);

    noiseSource.start();
    subOsc1.start();
    subOsc2.start();
    filterLfo.start();

    return () => {
      try {
        noiseSource.stop();
        subOsc1.stop();
        subOsc2.stop();
        filterLfo.stop();
        noiseSource.disconnect();
        subOsc1.disconnect();
        subOsc2.disconnect();
        filterLfo.disconnect();
        noiseFilter.disconnect();
      } catch {}
    };
  }

  /**
   * Converts 0-100 volume percent to gain scalar (max ~0.7 for comfortable listening)
   */
  private percentToGain(volumePercent: number): number {
    const clamped = Math.max(0, Math.min(100, volumePercent));
    // Soft perceptual curve
    return (clamped / 100) * 0.72;
  }

  /**
   * Starts or crossfades into an acoustic preset
   */
  public playPreset(preset: AcousticPreset, volumePercent: number = this.currentVolumePercent): boolean {
    try {
      const ctx = this.getContext();
      this.currentVolumePercent = volumePercent;
      const targetGain = this.percentToGain(volumePercent);

      // If already playing the same preset, just update volume
      if (this.activePreset === preset && this.activeNodes) {
        this.setVolume(volumePercent);
        return true;
      }

      // If playing another preset, smoothly fade out and stop old nodes
      if (this.activeNodes) {
        const oldNodes = this.activeNodes;
        try {
          oldNodes.masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
          setTimeout(() => {
            oldNodes.stopNodes();
          }, 150);
        } catch {
          oldNodes.stopNodes();
        }
      }

      // Build new master gain node with gentle fade-in
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.08);
      masterGain.connect(ctx.destination);

      let stopNodes: () => void;
      switch (preset) {
        case "rain":
          stopNodes = this.buildRainNodes(ctx, masterGain);
          break;
        case "binaural":
          stopNodes = this.buildBinauralNodes(ctx, masterGain);
          break;
        case "space":
          stopNodes = this.buildSpaceNodes(ctx, masterGain);
          break;
        default:
          stopNodes = this.buildRainNodes(ctx, masterGain);
      }

      this.activePreset = preset;
      this.activeNodes = {
        masterGain,
        stopNodes,
      };

      return true;
    } catch (err) {
      console.error("Failed to play acoustic preset:", err);
      return false;
    }
  }

  /**
   * Updates playback volume in real time
   */
  public setVolume(volumePercent: number): void {
    this.currentVolumePercent = volumePercent;
    if (!this.activeNodes || !this.ctx) return;

    try {
      const targetGain = this.percentToGain(volumePercent);
      this.activeNodes.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    } catch (err) {
      console.warn("Could not set sound volume:", err);
    }
  }

  /**
   * Stops the active preset sound with a smooth fade-out
   */
  public stop(): void {
    if (!this.activeNodes || !this.ctx) {
      this.activePreset = null;
      this.activeNodes = null;
      return;
    }

    try {
      const currentNodes = this.activeNodes;
      currentNodes.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      setTimeout(() => {
        currentNodes.stopNodes();
      }, 150);
    } catch {
      this.activeNodes.stopNodes();
    } finally {
      this.activePreset = null;
      this.activeNodes = null;
    }
  }

  /**
   * Plays a tranquil, crystal-clear meditation bell / temple chime
   * for session completion or user preview.
   */
  public playChime(volumePercent: number = 75): void {
    try {
      const ctx = this.getContext();
      const baseGain = (Math.max(10, Math.min(100, volumePercent)) / 100) * 0.45;
      const now = ctx.currentTime;

      // Solfeggio 528Hz bell harmonic spectrum
      const harmonics = [
        { freq: 528.0, gain: 0.85, decay: 3.2 },   // Fundamental
        { freq: 1056.0, gain: 0.40, decay: 2.2 },  // Octave harmonic
        { freq: 1584.0, gain: 0.18, decay: 1.6 },  // Fifth overtone
        { freq: 2640.0, gain: 0.08, decay: 0.9 },  // Shimmer sparkle
      ];

      const masterChimeGain = ctx.createGain();
      masterChimeGain.gain.setValueAtTime(baseGain, now);
      masterChimeGain.connect(ctx.destination);

      harmonics.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        // Instant soft attack to prevent clicks, then natural exponential bell ring decay
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(gain, now + 0.008);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(oscGain);
        oscGain.connect(masterChimeGain);

        osc.start(now);
        osc.stop(now + decay + 0.05);

        setTimeout(() => {
          try {
            osc.disconnect();
            oscGain.disconnect();
          } catch {}
        }, (decay + 0.2) * 1000);
      });
    } catch (err) {
      console.error("Failed to play completion chime:", err);
    }
  }

  public isPlaying(): boolean {
    return this.activeNodes !== null;
  }

  public getActivePreset(): AcousticPreset | null {
    return this.activePreset;
  }
}

// Global singleton instance
let synthInstance: SoundSynthesizer | null = null;

export function getSoundSynth(): SoundSynthesizer {
  if (!synthInstance) {
    synthInstance = new SoundSynthesizer();
  }
  return synthInstance;
}
