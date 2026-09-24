import { Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { audioEngine } from "@/lib/visualizer/audio-engine";
import { useViz } from "@/lib/visualizer/store";
import { Hud, toggleFullscreen } from "./hud";
import { Landing } from "./landing";
import { VisualizerCanvas } from "./visualizer-canvas";

function listen(target: EventTarget, name: string, fn: EventListener) {
  target.addEventListener(name, fn);
  return () => target.removeEventListener(name, fn);
}

export function VisualizerApp() {
  const fileRef = useRef<HTMLInputElement>(null);
  const started = useViz((s) => s.started);
  const hudVisible = useViz((s) => s.hudVisible);
  const hudPinned = useViz((s) => s.hudPinned);
  const error = useViz((s) => s.error);
  const dropping = useViz((s) => s.dropping);
  const source = useViz((s) => s.source);
  const mode = useViz((s) => s.mode);
  const playing = useViz((s) => s.playing);
  const fullscreen = useViz((s) => s.fullscreen);
  const setHudVisible = useViz((s) => s.setHudVisible);
  const setFullscreen = useViz((s) => s.setFullscreen);
  const setDropping = useViz((s) => s.setDropping);
  const hideTimer = useRef(0);

  const bumpHud = useCallback(() => {
    const pinned = useViz.getState().hudPinned;
    setHudVisible(true);
    window.clearTimeout(hideTimer.current);
    if (!pinned && useViz.getState().started) {
      hideTimer.current = window.setTimeout(() => setHudVisible(false), 2800);
    }
  }, [setHudVisible]);

  useEffect(() => {
    useViz.getState().hydrate();
  }, []);

  useEffect(() => {
    const onFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setFullscreen(Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement));
    };
    const off = listen(document, "fullscreenchange", onFs);
    const offWebkit = listen(document, "webkitfullscreenchange", onFs);
    return () => {
      off();
      offWebkit();
    };
  }, [setFullscreen]);

  useEffect(() => {
    const onMove = () => bumpHud();
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        audioEngine.unlock();
        audioEngine.togglePlay();
        bumpHud();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
      } else if (e.key === "1") useViz.getState().setMode("bars");
      else if (e.key === "2") useViz.getState().setMode("orbit");
      else if (e.key === "3") useViz.getState().setMode("wave");
      else if (e.key === "4") useViz.getState().setMode("bloom");
      else if (e.key === "m" || e.key === "M") void audioEngine.startMic();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hideTimer.current);
    };
  }, [bumpHud]);

  useEffect(() => {
    if (hudPinned || !started) {
      setHudVisible(true);
      window.clearTimeout(hideTimer.current);
    }
  }, [hudPinned, started, setHudVisible]);

  const openFile = () => fileRef.current?.click();

  const takeFile = (file: File | undefined) => {
    if (!file) return;
    audioEngine.unlock();
    void audioEngine.loadFile(file);
    bumpHud();
  };

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-bg text-fg"
      data-started={started ? "true" : "false"}
      data-source={source}
      data-mode={mode}
      data-playing={playing ? "true" : "false"}
      onDragOver={(e) => {
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropping(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        takeFile(e.dataTransfer.files[0]);
      }}
    >
      <VisualizerCanvas />

      <input
        ref={fileRef}
        type="file"
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac,.webm"
        className="hidden"
        onChange={(e) => {
          takeFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!started ? (
        <Landing
          onListen={() => {
            audioEngine.unlock();
            void audioEngine.startMic();
          }}
          onOpenFile={openFile}
          onDemo={() => {
            audioEngine.unlock();
            audioEngine.startDemo();
            bumpHud();
          }}
        />
      ) : null}

      {started ? <Hud visible={hudVisible || hudPinned} onOpenFile={openFile} /> : null}

      <div className="absolute top-[max(1rem,env(safe-area-inset-top))] right-3 z-20 sm:right-5">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? <Minimize2 /> : <Maximize2 />}
        </Button>
      </div>

      {dropping ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-bg/50">
          <p className="rounded-lg bg-surface px-5 py-3 text-sm shadow-[0_0_0_1px_rgb(255_255_255_/0.1)]">
            Drop an audio file
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          role="status"
          className="absolute top-[max(1rem,env(safe-area-inset-top))] right-3 left-3 z-30 mx-auto max-w-md rounded-md bg-surface px-4 py-3 text-sm text-fg shadow-[0_0_0_1px_rgb(255_255_255_/0.1)]"
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-xs text-muted hover:text-fg"
            onClick={() => useViz.setState({ error: null })}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <p className="pointer-events-none absolute top-[max(1.15rem,env(safe-area-inset-top))] left-4 z-10 hidden font-display text-sm font-bold tracking-[0.2em] text-fg/70 uppercase sm:block">
        Auralis
      </p>
    </main>
  );
}
