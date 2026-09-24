import { useEffect, useRef } from "react";
import { audioEngine } from "@/lib/visualizer/audio-engine";
import { VisualizerRenderer } from "@/lib/visualizer/renderer";
import { useViz } from "@/lib/visualizer/store";

export function VisualizerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mode = useViz((s) => s.mode);
  const theme = useViz((s) => s.theme);
  const sensitivity = useViz((s) => s.sensitivity);
  const live = useRef({ mode, theme, sensitivity });
  live.current = { mode, theme, sensitivity };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new VisualizerRenderer(canvas);
    let raf = 0;
    let alive = true;
    let last = performance.now();
    const loop = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = live.current;
      renderer.draw(audioEngine.getFrame(), s.mode, s.theme, s.sensitivity, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full touch-none"
      aria-hidden
    />
  );
}
