import { DemoSynth } from "./demo-synth";
import { useViz } from "./store";
import type { FrameData } from "./types";

function emptyBytes(n: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(n));
  bytes.fill(128);
  return bytes;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private input: GainNode | null = null;
  private output: GainNode | null = null;
  private freq: Uint8Array<ArrayBuffer> = emptyBytes(1024);
  private time: Uint8Array<ArrayBuffer> = emptyBytes(2048);
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private demo: DemoSynth | null = null;
  private objectUrl: string | null = null;
  private visChange: (() => void) | null = null;

  get context() {
    return this.ctx;
  }

  get element() {
    return this.audioEl;
  }

  unlock() {
    this.ensure();
    if (this.ctx && this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
  }

  private ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext({ latencyHint: "interactive" });
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyser.minDecibels = -92;
    analyser.maxDecibels = -22;
    const input = ctx.createGain();
    const output = ctx.createGain();
    input.gain.value = 1;
    output.gain.value = useViz.getState().volume;
    input.connect(analyser);
    analyser.connect(output);
    output.connect(ctx.destination);

    this.ctx = ctx;
    this.analyser = analyser;
    this.input = input;
    this.output = output;
    this.freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    this.time = new Uint8Array(new ArrayBuffer(analyser.fftSize));

    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    this.audioEl = audio;
    this.bindMedia(audio);
    this.mediaSource = ctx.createMediaElementSource(audio);
    this.demo = new DemoSynth(ctx, input);

    this.visChange = () => {
      if (document.visibilityState === "visible") this.unlock();
    };
    document.addEventListener("visibilitychange", this.visChange);
  }

  private bindMedia(audio: HTMLAudioElement) {
    audio.onplay = () => useViz.setState({ playing: true });
    audio.onpause = () => {
      if (useViz.getState().source === "file") useViz.setState({ playing: false });
    };
    audio.onended = () => useViz.setState({ playing: false, currentTime: 0 });
    audio.ontimeupdate = () => {
      useViz.setState({
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    audio.onerror = () => {
      useViz.setState({
        error: "Could not read that file. Try an mp3, wav, or m4a.",
        playing: false,
      });
    };
  }

  setVolume(value: number) {
    if (!this.ctx || !this.output) return;
    const v = value * value;
    this.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  getFrame(): FrameData {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.time);
    }
    const { source, playing } = useViz.getState();
    const active = source !== "idle" && (source === "mic" || playing);
    return {
      freq: this.freq,
      time: this.time,
      active,
      sampleRate: this.ctx?.sampleRate ?? 44100,
    };
  }

  async startMic() {
    this.unlock();
    if (!this.ctx || !this.input) return;
    this.stopSources({ keepFile: true });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      this.micStream = stream;
      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.input);
      this.output?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
      useViz.setState({
        started: true,
        source: "mic",
        playing: true,
        trackName: "Microphone",
        error: null,
        duration: 0,
        currentTime: 0,
      });
    } catch {
      useViz.setState({
        error: "Microphone permission was denied. You can still open a track or play the demo.",
        source: "idle",
        playing: false,
      });
    }
  }

  async loadFile(file: File) {
    this.unlock();
    if (!this.ctx || !this.input || !this.audioEl || !this.mediaSource) return;
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|flac|aac|webm)$/i.test(file.name)) {
      useViz.setState({ error: "That does not look like an audio file." });
      return;
    }
    this.stopSources({ keepFile: true });
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.audioEl.src = this.objectUrl;
    this.mediaSource.connect(this.input);
    this.setVolume(useViz.getState().volume);
    useViz.setState({
      started: true,
      source: "file",
      trackName: file.name.replace(/\.[^.]+$/, ""),
      error: null,
      currentTime: 0,
    });
    try {
      await this.audioEl.play();
    } catch {
      useViz.setState({ playing: false });
    }
  }

  startDemo() {
    this.unlock();
    if (!this.ctx || !this.input || !this.demo) return;
    this.stopSources({ keepFile: true });
    this.setVolume(useViz.getState().volume);
    this.demo.start();
    useViz.setState({
      started: true,
      source: "demo",
      playing: true,
      trackName: "Pulse — generative",
      error: null,
      duration: 0,
      currentTime: 0,
    });
  }

  togglePlay() {
    const { source, playing } = useViz.getState();
    if (source === "file" && this.audioEl) {
      if (this.audioEl.paused) void this.audioEl.play();
      else this.audioEl.pause();
      return;
    }
    if (source === "demo") {
      if (playing) {
        this.demo?.stop();
        useViz.setState({ playing: false });
      } else {
        this.unlock();
        this.demo?.start();
        useViz.setState({ playing: true });
      }
    }
  }

  seek(seconds: number) {
    if (this.audioEl && useViz.getState().source === "file") {
      this.audioEl.currentTime = seconds;
      useViz.setState({ currentTime: seconds });
    }
  }

  private stopSources(opts?: { keepFile?: boolean }) {
    this.demo?.stop();
    if (this.micSource) {
      try {
        this.micSource.disconnect();
      } catch {
        /* noop */
      }
      this.micSource = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) track.stop();
      this.micStream = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        /* noop */
      }
    }
    if (!opts?.keepFile && this.audioEl) {
      this.audioEl.pause();
    } else if (this.audioEl && !this.audioEl.paused) {
      this.audioEl.pause();
    }
  }

  stopAll() {
    this.stopSources();
    useViz.setState({
      source: "idle",
      playing: false,
      trackName: null,
      currentTime: 0,
      duration: 0,
    });
  }
}

export const audioEngine = new AudioEngine();
