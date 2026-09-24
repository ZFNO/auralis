import type { Theme, ThemeId } from "./types";

export const THEMES: Record<ThemeId, Theme> = {
  ice: {
    id: "ice",
    name: "Ice",
    bg: [7, 8, 12],
    a: [90, 210, 230],
    b: [170, 230, 245],
    c: [240, 250, 255],
    glow: [110, 220, 235],
  },
  ember: {
    id: "ember",
    name: "Ember",
    bg: [12, 6, 4],
    a: [230, 90, 45],
    b: [245, 170, 90],
    c: [255, 230, 200],
    glow: [240, 80, 35],
  },
  tide: {
    id: "tide",
    name: "Tide",
    bg: [4, 10, 16],
    a: [30, 140, 210],
    b: [70, 210, 190],
    c: [190, 240, 250],
    glow: [40, 170, 210],
  },
  noir: {
    id: "noir",
    name: "Noir",
    bg: [6, 6, 7],
    a: [170, 170, 176],
    b: [220, 220, 224],
    c: [248, 248, 250],
    glow: [210, 210, 214],
  },
};

export const THEME_LIST = THEME_IDS_TO_LIST();

function THEME_IDS_TO_LIST(): Theme[] {
  return [THEMES.ice, THEMES.ember, THEMES.tide, THEMES.noir];
}
