// Natural, muted color palette
export const FlowerColors = {
  rose,
  roseDark,
  roseLight,
  blush,
  lavender,
  cream,
  peach,
  coral,
  mauve,
  dustyPink,
};

export const VineColors = {
  main,        // Vibrant spring/garden green
  dark,        // Softer outline green (was 0x1a2e1a - too dark)
  light,       // Bright core highlight green
  stem,        // Stem color
  leaf,        // Main leaf
  leafDark,    // Leaf shadow
  leafLight,   // Leaf highlight
  tendril,     // Tendril color
};

export const EffectColors = {
  heartRed,
  heartPink,
  sparkleGold,
  sparkleWhite,
  glowSoft,
};

const flowerColorNames = Object.keys(FlowerColors)[];

export function getRandomFlowerColor() {
  const colorName = flowerColorNames[Math.floor(Math.random() * flowerColorNames.length)];
  return FlowerColors[colorName];
}

export function getFlowerColorByIndex(index) {
  const colorName = flowerColorNames[index % flowerColorNames.length];
  return FlowerColors[colorName];
}

export function hexToRgb(hex): { r; g; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

export function rgbToHex(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

export function lerpColor(color1, color2, t) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * t);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * t);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * t);

  return rgbToHex(r, g, b);
}

export function lighten(color, amount) {
  const rgb = hexToRgb(color);
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return rgbToHex(r, g, b);
}

export function darken(color, amount) {
  const rgb = hexToRgb(color);
  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));
  return rgbToHex(r, g, b);
}

export function userIdToColor(userId) {
  if (!userId) return FlowerColors.rose; // Fallback to rose
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % flowerColorNames.length;
  return FlowerColors[flowerColorNames[index]];
}

/**
 * Parses a Twitch color string (e.g., "#FF0000" or "") into a number.
 * Returns null if the color is invalid or missing.
 */
export function parseTwitchColor(colorStr?: string) | null {
  if (!colorStr) return null;
  // Deep Persistence Fix: Support both prefixed and non-prefixed hex strings
  const str = colorStr.startsWith('#') ? colorStr.substring(1) ;
  if (str.length !== 6) return null;
  const val = parseInt(str, 16);
  return isNaN(val) ? null ;
}
