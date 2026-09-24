import { Mic, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type LandingProps = {
  onListen: () => void;
  onOpenFile: () => void;
  onDemo: () => void;
};

export function Landing({ onListen, onOpenFile, onDemo }: LandingProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-6 sm:items-center sm:p-10">
      <div className="pointer-events-auto stagger-in flex w-full max-w-lg flex-col items-start gap-6 rounded-xl bg-bg/55 px-6 py-7 shadow-[0_0_0_1px_rgb(255_255_255_/0.08)] backdrop-blur-sm sm:items-center sm:px-10 sm:py-10 sm:text-center">
        <p className="text-xs font-medium tracking-[0.28em] text-muted uppercase">
          Visualizer
        </p>
        <h1 className="font-display text-5xl leading-none font-extrabold tracking-tight text-fg sm:text-6xl">
          Auralis
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-muted">
          Microphone or a track. Bars, orbits, waves, bloom. Quiet controls, full
          screen, live color.
        </p>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button variant="solid" size="lg" className="w-full sm:w-auto" onClick={onListen}>
            <Mic />
            Listen
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={onOpenFile}>
            <Upload />
            Open track
          </Button>
        </div>
        <button
          type="button"
          onClick={onDemo}
          className="inline-flex h-11 items-center gap-2 text-sm text-muted transition-[color,opacity] duration-150 ease-out hover:text-fg"
        >
          <Play className="size-3.5" />
          Play a generated pulse
        </button>
      </div>
    </div>
  );
}
