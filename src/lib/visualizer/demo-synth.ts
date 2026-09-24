const BPM = 96;
const STEP = 60 / BPM / 4;

const BASS = [110, 110, 87.31, 98];
const ARP = [
  [220, 261.63, 329.63, 392],
  [220, 246.94, 329.63, 440],
  [174.61, 220, 261.63, 349.23],
  [196, 246.94, 293.66, 392],
];

function makeNoise(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 0.4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class DemoSynth {
  private ctx: AudioContext;
  private dest: AudioNode;
  private noise: AudioBuffer;
  private nextTime = 0;
  private step = 0;
  private timer: number | null = null;
  private nodes: AudioNode[] = [];
  running = false;

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
    this.noise = makeNoise(ctx);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.step = 0;
    this.tick();
  }

  stop() {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    for (const node of this.nodes) {
      try {
        node.disconnect();
      } catch {
        /* already gone */
      }
    }
    this.nodes = [];
  }

  private tick = () => {
    if (!this.running) return;
    const horizon = this.ctx.currentTime + 0.12;
    while (this.nextTime < horizon) {
      this.schedule(this.step, this.nextTime);
      this.step += 1;
      this.nextTime += STEP;
    }
    this.timer = window.setTimeout(this.tick, 25);
  };

  private schedule(step: number, time: number) {
    const bar = Math.floor(step / 16) % 8;
    const beat = step % 16;
    const chord = Math.floor(bar / 2) % 4;

    if (beat === 0 || beat === 8) this.kick(time);
    if (beat === 4 || beat === 12) this.hat(time, 0.12, 0.18);
    if (beat % 2 === 0) this.hat(time, 0.035, 0.08);
    if (beat === 0 || beat === 6 || beat === 10) {
      this.bass(time, BASS[chord]!);
    }
    if (beat % 2 === 0) {
      const notes = ARP[chord]!;
      const note = notes[(beat / 2) % notes.length]!;
      this.tone(time, note, beat === 0 ? 0.12 : 0.07);
    }
  }

  private track(node: AudioNode) {
    this.nodes.push(node);
    const drop = () => {
      const i = this.nodes.indexOf(node);
      if (i >= 0) this.nodes.splice(i, 1);
    };
    if ("onended" in node) {
      (node as AudioBufferSourceNode).onended = drop;
    }
  }

  private kick(time: number) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.14);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.9, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.28);
    osc.connect(gain);
    gain.connect(this.dest);
    osc.start(time);
    osc.stop(time + 0.3);
    this.track(osc);
    this.track(gain);
  }

  private hat(time: number, dur: number, vol: number) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest);
    src.start(time);
    src.stop(time + dur + 0.02);
    this.track(src);
    this.track(filter);
    this.track(gain);
  }

  private bass(time: number, freq: number) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(160, time + 0.4);
    filter.Q.value = 6;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.22, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.55);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest);
    osc.start(time);
    osc.stop(time + 0.58);
    this.track(osc);
    this.track(filter);
    this.track(gain);
  }

  private tone(time: number, freq: number, vol: number) {
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc2.type = "sine";
    osc.frequency.value = freq;
    osc2.frequency.value = freq * 2.01;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.dest);
    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.24);
    osc2.stop(time + 0.24);
    this.track(osc);
    this.track(osc2);
    this.track(gain);
  }
}
