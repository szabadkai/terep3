import type { ControlInput, VehicleState } from './vehicleDynamics';

export type GameAudio = {
  readonly setMusicEnabled: (enabled: boolean) => void;
  readonly setSfxEnabled: (enabled: boolean) => void;
  readonly setMusicTrackIndex: (trackIndex: number) => void;
  readonly updateEngine: (vehicle: VehicleState, input: ControlInput, deltaSeconds: number) => void;
  readonly playGateClear: (gateNumber: number, totalGates: number) => void;
  readonly playCompletion: (bestTimeImproved: boolean) => void;
  readonly playRetry: () => void;
  readonly playRecovery: () => void;
  readonly dispose: () => void;
};

export type MusicTrack = {
  readonly label: string;
  readonly file: string;
};

export const musicTracks: readonly MusicTrack[] = [
  { label: 'Police Loop', file: 'audio/chiptune-police-loop.mp3' },
  { label: 'Fast BG', file: 'audio/fast-background.mp3' },
  { label: 'Plimplom', file: 'audio/plimplom.ogg' },
] as const;

const engineBaseFrequency = 24;
const engineMaxFrequency = 52;
const musicTargetGain = 0.3;
const gearShiftSeconds = 0.18;

const gearRanges = [
  { min: 0, max: 10 },
  { min: 8, max: 18 },
  { min: 16, max: 29 },
  { min: 26, max: 43 },
  { min: 39, max: 62 },
] as const;

type AudioContextWindow = Window &
  typeof globalThis & {
    readonly webkitAudioContext?: typeof AudioContext;
  };

export function createGameAudio(tracks: readonly MusicTrack[]): GameAudio {
  const audioWindow = window as AudioContextWindow;
  const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    return createSilentGameAudio();
  }

  let context: AudioContext | undefined;
  let masterGain: GainNode | undefined;
  let musicElement: HTMLAudioElement | undefined;
  let musicSource: MediaElementAudioSourceNode | undefined;
  let musicGain: GainNode | undefined;
  let engineSubOscillator: OscillatorNode | undefined;
  let engineRumbleSource: AudioBufferSourceNode | undefined;
  let engineRumbleFilter: BiquadFilterNode | undefined;
  let engineFilter: BiquadFilterNode | undefined;
  let engineSubGain: GainNode | undefined;
  let engineRumbleGain: GainNode | undefined;
  let engineGain: GainNode | undefined;
  let musicEnabled = false;
  let sfxEnabled = false;
  let currentMusicTrackIndex = 0;
  let disposed = false;
  let engineLevel = 0;
  let engineGear = 0;
  let shiftEndsAt = 0;

  const ensureGraph = () => {
    if (context || disposed) {
      return context;
    }

    context = new AudioContextConstructor();
    masterGain = context.createGain();
    masterGain.gain.value = 0.72;
    masterGain.connect(context.destination);

    musicGain = context.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(masterGain);

    musicElement = new Audio(resolveTrackUrl(tracks[currentMusicTrackIndex]));
    musicElement.loop = true;
    musicElement.preload = 'auto';
    musicElement.crossOrigin = 'anonymous';
    musicSource = context.createMediaElementSource(musicElement);
    musicSource.connect(musicGain);

    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineGain.connect(masterGain);

    engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 180;
    engineFilter.Q.value = 0.58;
    engineFilter.connect(engineGain);

    engineRumbleFilter = context.createBiquadFilter();
    engineRumbleFilter.type = 'bandpass';
    engineRumbleFilter.frequency.value = 70;
    engineRumbleFilter.Q.value = 0.85;

    engineRumbleGain = context.createGain();
    engineRumbleGain.gain.value = 1.45;
    engineRumbleFilter.connect(engineRumbleGain);
    engineRumbleGain.connect(engineFilter);

    engineRumbleSource = context.createBufferSource();
    engineRumbleSource.buffer = createRumbleBuffer(context);
    engineRumbleSource.loop = true;
    engineRumbleSource.connect(engineRumbleFilter);
    engineRumbleSource.start();

    engineSubGain = context.createGain();
    engineSubGain.gain.value = 0.48;
    engineSubGain.connect(engineFilter);

    engineSubOscillator = context.createOscillator();
    engineSubOscillator.type = 'sine';
    engineSubOscillator.frequency.value = engineBaseFrequency;
    engineSubOscillator.connect(engineSubGain);
    engineSubOscillator.start();

    return context;
  };

  const resumeAndPlay = () => {
    const graph = ensureGraph();

    if (!graph || !musicElement || !musicGain || tracks.length === 0) {
      return;
    }

    if (graph.state === 'suspended') {
      void graph.resume();
    }

    musicGain.gain.setTargetAtTime(musicTargetGain, graph.currentTime, 0.4);
    void musicElement.play().catch(() => undefined);
  };

  const stopMusic = () => {
    if (!context || !musicGain || !musicElement) {
      return;
    }

    musicGain.gain.setTargetAtTime(0, context.currentTime, 0.22);
    window.setTimeout(() => {
      if (!musicEnabled && musicElement) {
        musicElement.pause();
      }
    }, 380);
  };

  const changeTrack = (trackIndex: number) => {
    const graph = ensureGraph();

    if (!graph || !musicElement || tracks.length === 0) {
      return;
    }

    currentMusicTrackIndex = wrapTrackIndex(trackIndex, tracks.length);
    musicElement.src = resolveTrackUrl(tracks[currentMusicTrackIndex]);
    musicElement.currentTime = 0;

    if (musicEnabled) {
      resumeAndPlay();
    }
  };

  const createEnvelope = (attackGain: number, sustainSeconds: number, releaseSeconds: number) => {
    const graph = ensureGraph();

    if (!graph || !masterGain) {
      return undefined;
    }

    const gain = graph.createGain();
    const now = graph.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(attackGain, 0.0001), now + 0.018);
    gain.gain.setTargetAtTime(0.0001, now + sustainSeconds, releaseSeconds);
    gain.connect(masterGain);

    return gain;
  };

  const playTone = (frequency: number, type: OscillatorType, gain: number, sustainSeconds: number, releaseSeconds: number) => {
    if (!sfxEnabled) {
      return;
    }

    const graph = ensureGraph();
    const envelope = createEnvelope(gain, sustainSeconds, releaseSeconds);

    if (!graph || !envelope) {
      return;
    }

    const oscillator = graph.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, graph.currentTime);
    oscillator.connect(envelope);
    oscillator.start();
    oscillator.stop(graph.currentTime + sustainSeconds + releaseSeconds * 4);
  };

  return {
    setMusicEnabled(nextEnabled) {
      musicEnabled = nextEnabled;

      if (musicEnabled) {
        resumeAndPlay();
        return;
      }

      stopMusic();
    },
    setSfxEnabled(nextEnabled) {
      sfxEnabled = nextEnabled;

      if (context && engineGain) {
        engineGain.gain.setTargetAtTime(sfxEnabled ? engineLevel : 0, context.currentTime, 0.08);
      }
    },
    setMusicTrackIndex: changeTrack,
    updateEngine(vehicle, input, deltaSeconds) {
      if (!sfxEnabled) {
        return;
      }

      const graph = ensureGraph();

      if (!graph || !engineSubOscillator || !engineRumbleFilter || !engineFilter || !engineGain) {
        return;
      }

      const speedAmount = Math.min(Math.abs(vehicle.speed) / 42, 1);
      const speed = Math.abs(vehicle.speed);
      const throttleAmount = Math.max(input.throttle, input.brake * 0.45);
      const targetGear = selectGear(engineGear, speed);
      const isShifting = graph.currentTime < shiftEndsAt;

      if (!isShifting && targetGear !== engineGear) {
        engineGear = targetGear;
        shiftEndsAt = graph.currentTime + gearShiftSeconds;
        playTone(62, 'sine', 0.055, 0.03, 0.07);
      }

      const gearRange = gearRanges[engineGear];
      const gearProgress = Math.min(Math.max((speed - gearRange.min) / (gearRange.max - gearRange.min), 0), 1);
      const torqueLoad = Math.min(throttleAmount * (1.15 - gearProgress * 0.58) + input.brake * 0.18, 1);
      const shiftDip = isShifting ? 0.72 : 1;
      const targetLevel = Math.min(0.028 + speedAmount * 0.04 + torqueLoad * 0.052, 0.13) * shiftDip;
      const smoothing = Math.min(deltaSeconds * 7, 1);
      engineLevel += (targetLevel - engineLevel) * smoothing;
      const targetFrequency =
        (engineBaseFrequency + gearProgress * (engineMaxFrequency - engineBaseFrequency) + torqueLoad * 5) * shiftDip;
      const targetRumbleFrequency = 58 + gearProgress * 46 + torqueLoad * 34;
      const targetFilterFrequency = 145 + gearProgress * 92 + torqueLoad * 82;

      engineSubOscillator.frequency.setTargetAtTime(targetFrequency, graph.currentTime, 0.08);
      engineRumbleFilter.frequency.setTargetAtTime(targetRumbleFrequency, graph.currentTime, 0.08);
      engineFilter.frequency.setTargetAtTime(targetFilterFrequency, graph.currentTime, 0.12);
      engineGain.gain.setTargetAtTime(engineLevel, graph.currentTime, 0.08);
    },
    playGateClear(gateNumber, totalGates) {
      const interval = Math.min(gateNumber / totalGates, 1) * 180;
      playTone(520 + interval, 'triangle', 0.2, 0.08, 0.08);
      window.setTimeout(() => playTone(780 + interval, 'sine', 0.16, 0.06, 0.08), 80);
    },
    playCompletion(bestTimeImproved) {
      const notes = bestTimeImproved ? [620, 780, 930, 1240] : [520, 660, 780];
      notes.forEach((frequency, index) => {
        window.setTimeout(() => playTone(frequency, 'triangle', 0.2, 0.1, 0.1), index * 86);
      });
    },
    playRetry() {
      playTone(180, 'sawtooth', 0.16, 0.08, 0.11);
    },
    playRecovery() {
      playTone(96, 'square', 0.22, 0.06, 0.16);
      window.setTimeout(() => playTone(146, 'triangle', 0.12, 0.05, 0.12), 75);
    },
    dispose() {
      disposed = true;
      musicEnabled = false;
      sfxEnabled = false;
      musicElement?.pause();
      engineSubOscillator?.stop();
      engineRumbleSource?.stop();
      void context?.close();
    },
  };
}

function resolveTrackUrl(track: MusicTrack | undefined) {
  return track ? `${import.meta.env.BASE_URL}${track.file}` : '';
}

function wrapTrackIndex(trackIndex: number, trackCount: number) {
  return ((trackIndex % trackCount) + trackCount) % trackCount;
}

function createRumbleBuffer(context: AudioContext) {
  const durationSeconds = 1.2;
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * durationSeconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;

  for (let index = 0; index < data.length; index += 1) {
    brown = brown * 0.96 + (Math.random() * 2 - 1) * 0.04;
    data[index] = Math.max(-0.9, Math.min(0.9, brown)) * 0.55;
  }

  return buffer;
}

function selectGear(currentGear: number, speed: number) {
  const currentRange = gearRanges[currentGear];

  if (speed > currentRange.max && currentGear < gearRanges.length - 1) {
    return currentGear + 1;
  }

  if (speed < currentRange.min && currentGear > 0) {
    return currentGear - 1;
  }

  return currentGear;
}

function createSilentGameAudio(): GameAudio {
  return {
    setMusicEnabled: () => undefined,
    setSfxEnabled: () => undefined,
    setMusicTrackIndex: () => undefined,
    updateEngine: () => undefined,
    playGateClear: () => undefined,
    playCompletion: () => undefined,
    playRetry: () => undefined,
    playRecovery: () => undefined,
    dispose: () => undefined,
  };
}
