import { create } from "zustand";
import type { AudioSource, ThemeId, VizMode } from "./types";

const PREFS_KEY = "auralis-prefs-v1";

export type VizState = {
  started: boolean;
  mode: VizMode;
  theme: ThemeId;
  sensitivity: number;
  volume: number;
  source: AudioSource;
  playing: boolean;
  trackName: string | null;
  duration: number;
  currentTime: number;
  hudPinned: boolean;
  hudVisible: boolean;
  fullscreen: boolean;
  error: string | null;
  dropping: boolean;
  setMode: (mode: VizMode) => void;
  setTheme: (theme: ThemeId) => void;
  setSensitivity: (sensitivity: number) => void;
  setVolume: (volume: number) => void;
  setHudPinned: (hudPinned: boolean) => void;
  setHudVisible: (hudVisible: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setDropping: (dropping: boolean) => void;
  hydrate: () => void;
};

type Prefs = Pick<VizState, "mode" | "theme" | "sensitivity" | "volume" | "hudPinned">;

function persist(partial: Partial<Prefs>) {
  if (typeof window === "undefined") return;
  try {
    const prev = readPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {
    /* ignore quota */
  }
}

function readPrefs(): Partial<Prefs> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Prefs>;
  } catch {
    return {};
  }
}

export const useViz = create<VizState>((set) => ({
  started: false,
  mode: "orbit",
  theme: "ice",
  sensitivity: 1,
  volume: 0.85,
  source: "idle",
  playing: false,
  trackName: null,
  duration: 0,
  currentTime: 0,
  hudPinned: false,
  hudVisible: true,
  fullscreen: false,
  error: null,
  dropping: false,
  setMode: (mode) => {
    persist({ mode });
    set({ mode });
  },
  setTheme: (theme) => {
    persist({ theme });
    set({ theme });
  },
  setSensitivity: (sensitivity) => {
    persist({ sensitivity });
    set({ sensitivity });
  },
  setVolume: (volume) => {
    persist({ volume });
    set({ volume });
  },
  setHudPinned: (hudPinned) => {
    persist({ hudPinned });
    set({ hudPinned, hudVisible: true });
  },
  setHudVisible: (hudVisible) => set({ hudVisible }),
  setFullscreen: (fullscreen) => set({ fullscreen }),
  setDropping: (dropping) => set({ dropping }),
  hydrate: () => {
    const prefs = readPrefs();
    set({
      mode: prefs.mode ?? "orbit",
      theme: prefs.theme ?? "ice",
      sensitivity: prefs.sensitivity ?? 1,
      volume: prefs.volume ?? 0.85,
      hudPinned: prefs.hudPinned ?? false,
    });
  },
}));
