export const VIZ_MODES = ["bars", "orbit", "wave", "bloom"] as const;
export type VizMode = (typeof VIZ_MODES)[number];

export const THEME_IDS = ["ice", "ember", "tide", "noir"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type AudioSource = "idle" | "mic" | "file" | "demo";

export type Rgb = readonly [number, number, number];

export type Theme = {
  id: ThemeId;
  name: string;
  bg: Rgb;
  a: Rgb;
  b: Rgb;
  c: Rgb;
  glow: Rgb;
};

export type FrameData = {
  freq: Uint8Array;
  time: Uint8Array;
  active: boolean;
  sampleRate: number;
};
