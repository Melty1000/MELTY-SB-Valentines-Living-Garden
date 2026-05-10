// Natural, muted color palette
export const FlowerColors = {
  rose: 0xb85c6e,
  roseDark: 0x8b4558,
  roseLight: 0xd4909e,
  blush: 0xc9a0a0,
  lavender: 0x8a7a94,
  cream: 0xf0e0d0,
  peach: 0xd4b090,
  coral: 0xb87068,
  mauve: 0xa07080,
  dustyPink: 0xb89090,
} as const;

export const VineColors = {
  main: 0x3a5438,        // Muted forest green
  dark: 0x283828,        // Darker shadow
  light: 0x4a6848,       // Lighter areas
  stem: 0x445840,        // Stem color
  leaf: 0x3e5a3a,        // Main leaf
  leafDark: 0x2e4430,    // Leaf shadow
  leafLight: 0x5a7850,   // Leaf highlight
  tendril: 0x4a6048,     // Tendril color
} as const;

export const EffectColors = {
  heartRed: 0xb85c6e,
  heartPink: 0xc9a0a0,
  sparkleGold: 0xe0d0a0,
  sparkleWhite: 0xfff8f0,
  glowSoft: 0xf0e0d0,
} as const;

export type FlowerColorName = keyof typeof FlowerColors;

const flowerColorNames = Object.keys(FlowerColors) as FlowerColorName[];

export function getRandomFlowerColor(): number {
  const colorName = flowerColorNames[Math.floor(Math.random() * flowerColorNames.length)];
  return FlowerColors[colorName];
}

export function getFlowerColorByIndex(index: number): number {
  const colorName = flowerColorNames[index % flowerColorNames.length];
  return FlowerColors[colorName];
}

export function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

export function rgbToHex(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export function lerpColor(color1: number, color2: number, t: number): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return rgbToHex(r, g, b);
}

export function lighten(color: number, amount: number): number {
  const rgb = hexToRgb(color);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return rgbToHex(r, g, b);
}

export function darken(color: number, amount: number): number {
  const rgb = hexToRgb(color);
  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));
  return rgbToHex(r, g, b);
}

export function userIdToColor(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % flowerColorNames.length;
  return FlowerColors[flowerColorNames[index]];
}
