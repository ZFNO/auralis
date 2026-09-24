import {
  Activity,
  Circle,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Pin,
  PinOff,
  Play,
  Sparkles,
  Upload,
  Volume2,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { audioEngine } from "@/lib/visualizer/audio-engine";
import { THEME_LIST } from "@/lib/visualizer/themes";
import { useViz } from "@/lib/visualizer/store";
import type { ThemeId, VizMode } from "@/lib/visualizer/types";
import { cn, formatTime } from "@/lib/utils";

const MODES: { id: VizMode; label: string; icon: typeof Activity }[] = [
  { id: "bars", label: "Bars", icon: Activity },
  { id: "orbit", label: "Orbit", icon: Circle },
  { id: "wave", label: "Wave", icon: Waves },
  { id: "bloom", label: "Bloom", icon: Sparkles },
];

const THEME_DOT: Record<ThemeId, string> = {
  ice: "bg-ice",
  ember: "bg-ember",
  tide: "bg-tide",
  noir: "bg-noir",
};

type HudProps = {
  visible: boolean;
  onOpenFile: () => void;
};

export function Hud({ visible, onOpenFile }: HudProps) {
  const mode = useViz((s) => s.mode);
  const theme = useViz((s) => s.theme);
  const sensitivity = useViz((s) => s.sensitivity);
  const volume = useViz((s) => s.volume);
  const source = useViz((s) => s.source);
  const playing = useViz((s) => s.playing);
  const trackName = useViz((s) => s.trackName);
  const duration = useViz((s) => s.duration);
  const currentTime = useViz((s) => s.currentTime);
  const fullscreen = useViz((s) => s.fullscreen);
  const hudPinned = useViz((s) => s.hudPinned);
  const setMode = useViz((s) => s.setMode);
  const setTheme = useViz((s) => s.setTheme);
  const setSensitivity = useViz((s) => s.setSensitivity);
  const setVolume = useViz((s) => s.setVolume);
  const setHudPinned = useViz((s) => s.setHudPinned);
  const canTransport = source === "file" || source === "demo";
  const canSeek = source === "file" && duration > 0;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(3.25rem,calc(env(safe-area-inset-bottom)+2.25rem))] sm:px-5",
        "transition-[opacity,transform] duration-200 ease-smooth-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex max-w-4xl flex-col gap-2 rounded-xl bg-bg/70 p-2.5 shadow-[0_0_0_1px_rgb(255_255_255_/0.08)] backdrop-blur-sm sm:gap-3 sm:p-3",
          visible ? "" : "pointer-events-none",
        )}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="muted"
            size="icon-sm"
            className="shrink-0"
            disabled={!canTransport && source !== "mic"}
            onClick={() => {
              if (source === "mic") audioEngine.stopAll();
              else audioEngine.togglePlay();
            }}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause /> : <Play className="ml-px" />}
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-medium text-fg">
                {trackName ?? "Idle"}
              </p>
              {canSeek ? (
                <p className="shrink-0 font-sans text-xs text-muted tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </p>
              ) : (
                <p className="shrink-0 text-xs tracking-wide text-muted uppercase">
                  {source === "mic" ? "Live" : source === "demo" ? "Loop" : "Ready"}
                </p>
              )}
            </div>
            {canSeek ? (
              <Slider
                className="mt-2"
                min={0}
                max={duration}
                step={0.1}
                value={[currentTime]}
                onValueChange={(v) => audioEngine.seek(v[0] ?? 0)}
                aria-label="Seek"
              />
            ) : (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-fg/10">
                <div
                  className="h-full w-2 bg-fg/40"
                  data-live={playing ? "on" : "off"}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-fg/6 p-1">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={active}
                  aria-label={m.label}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-[background-color,color] duration-150 ease-out",
                    active ? "bg-fg text-bg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex rounded-md bg-fg/6 p-1">
            {THEME_LIST.map((th) => {
              const active = theme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => setTheme(th.id)}
                  aria-pressed={active}
                  aria-label={th.name}
                  title={th.name}
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-xs font-medium transition-[background-color,color] duration-150 ease-out",
                    active ? "bg-fg/15 text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", THEME_DOT[th.id])} />
                  <span className="ml-1.5 hidden md:inline">{th.name}</span>
                </button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={source === "mic" ? "muted" : "ghost"}
              size="icon-sm"
              aria-label="Microphone"
              onClick={() => void audioEngine.startMic()}
            >
              <Mic />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Open track" onClick={onOpenFile}>
              <Upload />
            </Button>
            <Button
              variant={source === "demo" ? "muted" : "ghost"}
              size="icon-sm"
              aria-label="Play demo"
              onClick={() => audioEngine.startDemo()}
            >
              <Sparkles />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={hudPinned ? "Unpin controls" : "Pin controls"}
              onClick={() => setHudPinned(!hudPinned)}
            >
              {hudPinned ? <PinOff /> : <Pin />}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={() => void toggleFullscreen()}
            >
              {fullscreen ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-muted">Sense</span>
            <Slider
              min={0.3}
              max={2.4}
              step={0.05}
              value={[sensitivity]}
              onValueChange={(v) => setSensitivity(v[0] ?? 1)}
              aria-label="Sensitivity"
            />
            <span className="w-8 text-right text-xs text-muted tabular-nums">
              {sensitivity.toFixed(1)}
            </span>
          </label>
          <label className="flex items-center gap-3">
            <Volume2 className="size-3.5 shrink-0 text-muted" />
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={(v) => {
                const next = v[0] ?? 0.85;
                setVolume(next);
                audioEngine.setVolume(next);
              }}
              aria-label="Volume"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export async function toggleFullscreen() {
  const root = document.documentElement;
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => Promise<void>;
  };
  const el = root as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
  const active = document.fullscreenElement ?? doc.webkitFullscreenElement;
  try {
    if (!active) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else await el.webkitRequestFullscreen?.();
    } else if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else {
      await doc.webkitExitFullscreen?.();
    }
  } catch {
    useViz.setState({ error: "Fullscreen is not available in this view." });
  }
}
