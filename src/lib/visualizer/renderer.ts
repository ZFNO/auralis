import { THEMES } from "./themes";
import type { FrameData, Rgb, Theme, ThemeId, VizMode } from "./types";

const BAR_COUNT = 72;
const ORBIT_COUNT = 96;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function css(c: Rgb, a = 1) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function sampleLog(data: Uint8Array, count: number, out: Float32Array) {
  const n = data.length;
  const minBin = 2;
  const maxBin = Math.max(minBin + 1, Math.floor(n * 0.72));
  const logMin = Math.log(minBin);
  const logMax = Math.log(maxBin);
  for (let i = 0; i < count; i++) {
    const t0 = i / count;
    const t1 = (i + 1) / count;
    const a = Math.floor(Math.exp(logMin + (logMax - logMin) * t0));
    const b = Math.max(a + 1, Math.floor(Math.exp(logMin + (logMax - logMin) * t1)));
    let sum = 0;
    const hi = Math.min(b, n);
    for (let j = a; j < hi; j++) sum += data[j] ?? 0;
    out[i] = sum / (255 * (hi - a));
  }
}

function band(data: Uint8Array, from: number, to: number) {
  const hi = Math.min(to, data.length);
  let sum = 0;
  for (let i = from; i < hi; i++) sum += data[i] ?? 0;
  return sum / (255 * Math.max(1, hi - from));
}

export class VisualizerRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private w = 1;
  private h = 1;
  private dpr = 1;
  private bins = new Float32Array(ORBIT_COUNT);
  private smooth = new Float32Array(ORBIT_COUNT);
  private peaks = new Float32Array(ORBIT_COUNT);
  private particles: Particle[] = [];
  private bassPrev = 0;
  private spin = 0;
  private pulse = 0;
  private clock = 0;
  private observer: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  dispose() {
    this.observer.disconnect();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.floor(rect.width * this.dpr));
    this.h = Math.max(1, Math.floor(rect.height * this.dpr));
    if (this.canvas.width !== this.w || this.canvas.height !== this.h) {
      this.canvas.width = this.w;
      this.canvas.height = this.h;
    }
  }

  draw(frame: FrameData, mode: VizMode, themeId: ThemeId, sensitivity: number, dt: number) {
    const t = THEMES[themeId];
    const ctx = this.ctx;
    this.clock += dt;
    sampleLog(frame.freq, ORBIT_COUNT, this.bins);

    const idle = !frame.active;
    const k = 1 - Math.exp(-dt * (idle ? 4 : 14));
    for (let i = 0; i < ORBIT_COUNT; i++) {
      let target = this.bins[i] ?? 0;
      if (idle) {
        const breathe = 0.1 + 0.08 * Math.sin(this.clock * 0.7 + i * 0.18);
        target = breathe * (0.55 + 0.45 * Math.sin(this.clock * 0.25 + i * 0.07));
      } else {
        target = Math.min(1, Math.pow(target * sensitivity, 0.88));
      }
      const s = this.smooth[i] ?? 0;
      this.smooth[i] = s + (target - s) * k;
      const p = this.peaks[i] ?? 0;
      this.peaks[i] = target > p ? target : Math.max(0, p - dt * 0.38);
    }

    const bass = idle
      ? 0.22 + 0.1 * Math.sin(this.clock * 0.8)
      : Math.min(1, band(frame.freq, 1, 18) * sensitivity);
    this.pulse += (bass - this.pulse) * (1 - Math.exp(-dt * 8));
    this.spin += dt * (0.12 + this.pulse * 0.55);
    const onset = bass - this.bassPrev > 0.12 && bass > 0.32;
    this.bassPrev = bass;

    const fade = mode === "bloom" ? 0.16 : 0.22;
    ctx.fillStyle = css(t.bg, fade);
    ctx.fillRect(0, 0, this.w, this.h);

    if (mode === "bars") this.drawBars(t);
    else if (mode === "orbit") this.drawOrbit(t, frame);
    else if (mode === "wave") this.drawWave(t, frame);
    else this.drawBloom(t, onset, dt);

    this.vignette(t);
  }

  private drawBars(t: Theme) {
    const ctx = this.ctx;
    const count = BAR_COUNT;
    const margin = this.w * 0.08;
    const usable = this.w - margin * 2;
    const gap = Math.max(2, this.dpr);
    const bw = Math.max(2, (usable - gap * (count - 1)) / count);
    const midY = this.h * 0.56;
    const maxH = this.h * 0.38;

    for (let i = 0; i < count; i++) {
      const v = this.smooth[i] ?? 0;
      const peak = this.peaks[i] ?? 0;
      const x = margin + i * (bw + gap);
      const h = Math.max(2 * this.dpr, v * maxH);
      const color = mix(t.a, mix(t.b, t.c, v), v);
      ctx.fillStyle = css(color, 0.95);
      ctx.beginPath();
      ctx.roundRect(x, midY - h, bw, h, Math.min(bw / 2, 6 * this.dpr));
      ctx.fill();

      ctx.fillStyle = css(t.c, 0.18 + v * 0.35);
      ctx.fillRect(x, midY - h - 3 * this.dpr, bw, 2 * this.dpr);

      ctx.fillStyle = css(color, 0.28);
      ctx.beginPath();
      ctx.roundRect(x, midY + 4 * this.dpr, bw, h * 0.45, Math.min(bw / 2, 6 * this.dpr));
      ctx.fill();

      if (peak > 0.02) {
        const py = midY - peak * maxH;
        ctx.fillStyle = css(t.c, 0.7);
        ctx.fillRect(x, py, bw, 2 * this.dpr);
      }
    }

    ctx.fillStyle = css(t.c, 0.12);
    ctx.fillRect(margin, midY, usable, 1 * this.dpr);
  }

  private drawOrbit(t: Theme, frame: FrameData) {
    const ctx = this.ctx;
    const cx = this.w / 2;
    const cy = this.h / 2;
    const radius = Math.min(this.w, this.h) * 0.22;
    const maxLen = Math.min(this.w, this.h) * 0.28;
    const count = ORBIT_COUNT;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.spin * 0.15);

    ctx.beginPath();
    ctx.arc(0, 0, radius * (0.72 + this.pulse * 0.12), 0, Math.PI * 2);
    ctx.strokeStyle = css(t.a, 0.28 + this.pulse * 0.25);
    ctx.lineWidth = 2 * this.dpr;
    ctx.stroke();

    const time = frame.time;
    ctx.beginPath();
    const ringR = radius * 0.58;
    for (let i = 0; i <= 180; i++) {
      const idx = Math.floor((i / 180) * (time.length - 1));
      const amp = ((time[idx] ?? 128) - 128) / 128;
      const r = ringR + amp * radius * 0.28;
      const a = (i / 180) * Math.PI * 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = css(t.b, 0.55);
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.stroke();
    ctx.fillStyle = css(t.a, 0.08 + this.pulse * 0.08);
    ctx.fill();

    for (let i = 0; i < count; i++) {
      const v = this.smooth[i] ?? 0;
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      const inner = radius * 1.02;
      const len = 8 * this.dpr + v * maxLen;
      const x0 = Math.cos(a) * inner;
      const y0 = Math.sin(a) * inner;
      const x1 = Math.cos(a) * (inner + len);
      const y1 = Math.sin(a) * (inner + len);
      const color = mix(t.a, t.c, v);
      ctx.strokeStyle = css(color, 0.45 + v * 0.55);
      ctx.lineWidth = Math.max(1.5 * this.dpr, (Math.PI * 2 * inner) / count - 1.5 * this.dpr);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    const orb = 10 * this.dpr + this.pulse * 22 * this.dpr;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, orb * 3);
    g.addColorStop(0, css(t.c, 0.55 + this.pulse * 0.35));
    g.addColorStop(0.4, css(t.glow, 0.18));
    g.addColorStop(1, css(t.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, orb * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWave(t: Theme, frame: FrameData) {
    const ctx = this.ctx;
    const time = frame.time;
    const mid = this.h * 0.5;
    const amp = this.h * 0.28 * (0.55 + this.pulse * 0.7);

    const path = (scale: number, offset: number) => {
      ctx.beginPath();
      const n = 240;
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * this.w;
        const idx = Math.floor((i / n) * (time.length - 1));
        const v = ((time[idx] ?? 128) - 128) / 128;
        const idle = Math.sin(this.clock * 1.4 + i * 0.06) * 0.12;
        const y = mid + (v * scale + idle * (1 - scale)) * amp + offset;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };

    path(1, 0);
    ctx.lineTo(this.w, this.h);
    ctx.lineTo(0, this.h);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, mid - amp, 0, this.h);
    fill.addColorStop(0, css(t.a, 0.28));
    fill.addColorStop(1, css(t.bg, 0));
    ctx.fillStyle = fill;
    ctx.fill();

    path(1, 0);
    ctx.strokeStyle = css(t.c, 0.85);
    ctx.lineWidth = 2 * this.dpr;
    ctx.stroke();

    path(0.55, 0);
    ctx.strokeStyle = css(t.b, 0.4);
    ctx.lineWidth = 1.25 * this.dpr;
    ctx.stroke();

    const count = 48;
    const bw = this.w / count;
    for (let i = 0; i < count; i++) {
      const v = this.smooth[Math.floor((i / count) * ORBIT_COUNT)] ?? 0;
      const x = i * bw + bw * 0.25;
      const h = v * this.h * 0.12;
      ctx.fillStyle = css(t.a, 0.2 + v * 0.25);
      ctx.fillRect(x, this.h - h - 24 * this.dpr, bw * 0.5, h);
    }
  }

  private drawBloom(t: Theme, onset: boolean, dt: number) {
    const ctx = this.ctx;
    const cx = this.w / 2;
    const cy = this.h / 2;
    const base = Math.min(this.w, this.h);

    if (onset) {
      const burst = 18 + Math.floor(this.pulse * 16);
      for (let i = 0; i < burst; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 220;
        this.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 1,
          max: 0.8 + Math.random() * 0.9,
          size: 1.2 + Math.random() * 2.4,
        });
      }
      if (this.particles.length > 420) this.particles.splice(0, this.particles.length - 420);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (let ring = 0; ring < 5; ring++) {
      const energy = this.smooth[ring * 12] ?? 0;
      const r = base * (0.08 + ring * 0.07) + energy * base * 0.12 + this.pulse * 20;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = css(mix(t.a, t.c, ring / 5), 0.12 + energy * 0.35);
      ctx.lineWidth = (2 + energy * 8) * this.dpr;
      ctx.stroke();
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt / p.max;
      if (p.life <= 0) continue;
      ctx.fillStyle = css(mix(t.a, t.c, 1 - p.life), p.life * 0.7);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * this.dpr * (0.6 + p.life), 0, Math.PI * 2);
      ctx.fill();
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    const count = 64;
    for (let i = 0; i < count; i++) {
      const v = this.smooth[i] ?? 0;
      const a = (i / count) * Math.PI * 2 + this.spin * 0.4;
      const r0 = base * 0.06;
      const r1 = r0 + v * base * 0.22;
      ctx.strokeStyle = css(mix(t.glow, t.c, v), 0.25 + v * 0.5);
      ctx.lineWidth = 2 * this.dpr;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 0.22);
    g.addColorStop(0, css(t.c, 0.4 + this.pulse * 0.4));
    g.addColorStop(0.35, css(t.glow, 0.16));
    g.addColorStop(1, css(t.glow, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, base * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private vignette(t: Theme) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(
      this.w / 2,
      this.h / 2,
      Math.min(this.w, this.h) * 0.25,
      this.w / 2,
      this.h / 2,
      Math.max(this.w, this.h) * 0.72,
    );
    g.addColorStop(0, css(t.bg, 0));
    g.addColorStop(1, css(t.bg, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }
}
