import { Graphics, Renderer, Texture } from 'pixi.js';
import { darken, lighten, lerpColor } from './colors';
import { VineColors, FlowerColors } from './colors';

export interface FlowerShape {
  petalCount: number;
  petalLength: number;
  petalWidth: number;
  centerSize: number;
  color: number;
  centerColor: number;
}

export function generateFlowerShape(color: number, size: number, seed: number = Math.random() * 10000): FlowerShape {
  // Use seed only for petal count variation (subtle, keeps some personality)
  const s1 = (seed * 16807) % 2147483647;
  const r1 = (s1 / 2147483647); // 0..1

  return {
    petalCount: Math.floor(5 + r1 * 4), // 5-8 petals (subtle variation)
    petalLength: size * 0.75, // Fixed proportion
    petalWidth: size * 0.32, // Fixed proportion
    centerSize: size * 0.27, // Fixed proportion
    color: color,
    centerColor: darken(color, 0.3),
  };
}

/**
 * Draw a high-fidelity rose using broad, overlapping arcs with depth shading.
 */
export function drawRose(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  baseColor: number = FlowerColors.rose,
  openness: number = 1
): void {
  const scaledSize = size * (0.4 + openness * 0.6);

  // 1. BACKGROUND FILL to eliminate any gaps
  graphics.beginPath();
  graphics.circle(x, y, scaledSize * 0.8 * openness);
  graphics.fill({ color: darken(baseColor, 0.4) }); // Softly darkened base occlusion

  // 2. LAYERED PETALS with heavy overlap and shading
  // REFINED: Rotations offset to prevent alignment (User Request)
  // Using Golden Angle-ish increments to ensure natural distribution
  const layers = [
    { count: 6, radius: 0.85, rot: -0.15, scale: 1.25 }, // Outer: slight CCW tilt
    { count: 5, radius: 0.6, rot: 1.0, scale: 1.0 },     // Middle 1
    { count: 4, radius: 0.4, rot: 2.5, scale: 0.8 },     // Middle 2
    { count: 4, radius: 0.25, rot: 3.3, scale: 0.6 },    // Inner: 4 petals (User Req), Staggered ~45 deg
  ];

  // Draw layers from outside in
  for (let l = 0; l < layers.length; l++) {
    const layer = layers[l];

    // Visibility based on openness
    if (openness < 0.2 && l < 3) continue;
    if (openness < 0.4 && l < 2) continue;
    if (openness < 0.6 && l < 1) continue;

    // REFINED INVERTED RAMP: Slightly less dark outer
    const t = l / (layers.length - 1);
    const layerColor = lerpColor(darken(baseColor, 0.3), baseColor, t);

    for (let i = 0; i < layer.count; i++) {
      const angle = (i / layer.count) * Math.PI * 2 + layer.rot;
      const dist = scaledSize * layer.radius * 0.5 * openness;
      // Slightly reduced petal size for spacing
      const pSize = scaledSize * 0.65 * layer.scale;

      drawShadedPetal(graphics, x, y, angle, dist, pSize, layerColor);
    }
  }

  // 3. TIGHT ORGANIC SPIRAL CORE (use actual flower color, not hardcoded red)
  drawShadedSpiralBud(graphics, x, y, scaledSize * 0.4, baseColor, openness);
}

/**
 * Draws a broad overlapping petal with procedural shading for depth.
 */
function drawShadedPetal(
  graphics: Graphics,
  x: number,
  y: number,
  angle: number,
  dist: number,
  size: number,
  color: number
): void {
  const px = x + Math.cos(angle) * dist;
  const py = y + Math.sin(angle) * dist;

  // REFINED: Wider width (2.0) per user request
  const w = size * 2.0;
  const h = size * 1.3;

  const perpAngle = angle + Math.PI / 2;
  const tipX = px + Math.cos(angle) * h;
  const tipY = py + Math.sin(angle) * h;

  const leftX = px + Math.cos(perpAngle) * w * 0.5;
  const leftY = py + Math.sin(perpAngle) * w * 0.5;
  const rightX = px - Math.cos(perpAngle) * w * 0.5;
  const rightY = py - Math.sin(perpAngle) * w * 0.5;

  // Bezier coordinates for reuse
  const cp1Lx = leftX + Math.cos(angle) * h * 0.3;
  const cp1Ly = leftY + Math.sin(angle) * h * 0.3;
  const cp2Lx = leftX + Math.cos(angle) * h * 1.1;
  const cp2Ly = leftY + Math.sin(angle) * h * 1.1;

  const cp1Rx = rightX + Math.cos(angle) * h * 1.1;
  const cp1Ry = rightY + Math.sin(angle) * h * 1.1;
  const cp2Rx = rightX + Math.cos(angle) * h * 0.3;
  const cp2Ry = rightY + Math.sin(angle) * h * 0.3;

  // PETAL FILL
  graphics.beginPath();
  graphics.moveTo(px, py);
  graphics.bezierCurveTo(cp1Lx, cp1Ly, cp2Lx, cp2Ly, tipX, tipY);
  graphics.bezierCurveTo(cp1Rx, cp1Ry, cp2Rx, cp2Ry, px, py);
  graphics.fill({ color });

  // SHADING: Inner shadow (occlusion)
  graphics.beginPath();
  graphics.moveTo(px, py);
  graphics.bezierCurveTo(
    leftX + Math.cos(angle) * h * 0.2, leftY + Math.sin(angle) * h * 0.2,
    rightX + Math.cos(angle) * h * 0.2, rightY + Math.sin(angle) * h * 0.2,
    px, py
  );
  graphics.fill({ color: 0x000000, alpha: 0.25 });

  // REFINED: Darker outline matches fill shape exactly
  graphics.beginPath();
  graphics.moveTo(px, py);
  graphics.bezierCurveTo(cp1Lx, cp1Ly, cp2Lx, cp2Ly, tipX, tipY);
  graphics.bezierCurveTo(cp1Rx, cp1Ry, cp2Rx, cp2Ry, px, py);
  graphics.stroke({ width: 1.0, color: darken(color, 0.4), alpha: 0.6 });
}

/**
 * Draws a shaded wrapped bud.
 */
function drawShadedSpiralBud(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number,
  openness: number
): void {
  const steps = 12;
  const centerColor = lighten(color, 0.2); // Absolute glowing core peak brightness

  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const angle = t * Math.PI * 6 + openness * 0.4;
    // Spiral starts closer to center and wraps around it
    const dist = t * size * 0.35;
    const pSize = size * (0.2 + (1 - t) * 0.6);

    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    graphics.beginPath();
    graphics.ellipse(px, py, pSize, pSize * 0.55);
    graphics.fill({
      color: i % 2 === 0 ? lerpColor(centerColor, color, t) : darken(lerpColor(centerColor, color, t), 0.1),
      alpha: 1
    });
    // Inner rim
    graphics.stroke({ width: 0.5, color: 0xffffff, alpha: 0.2 });
  }
}

export function drawBud(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  graphics.beginPath();
  drawRose(graphics, x, y, size, color, 0.2);
}

export function drawSeed(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  graphics.beginPath();
  graphics.circle(x, y, size * 0.5);
  graphics.fill({ color: darken(color, 0.3) });
}

export function drawLeaf(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: number = VineColors.leaf
): void {
  const width = size * 0.45;
  const perpAngle = angle + Math.PI / 2;
  const tipX = x + Math.cos(angle) * size;
  const tipY = y + Math.sin(angle) * size;

  // 1. GENERATE ORGANIC EDGE PATH (with wiggle)
  // We use stable t-values to ensure no flickering
  const edgePtsL: { x: number; y: number }[] = [];
  const edgePtsR: { x: number; y: number }[] = [];
  const edgeSegments = 12;

  for (let i = 0; i <= edgeSegments; i++) {
    const t = i / edgeSegments;
    const coreX = x + (tipX - x) * t;
    const coreY = y + (tipY - y) * t;

    // Parabolic width profile
    const baseWidth = Math.sin(t * Math.PI) * width;

    // Organic wiggle (serration/waviness) - stable based on t
    const wiggle = Math.sin(t * Math.PI * 4) * (width * 0.12);
    const finalWidth = baseWidth + wiggle;

    edgePtsL.push({
      x: coreX + Math.cos(perpAngle) * finalWidth,
      y: coreY + Math.sin(perpAngle) * finalWidth
    });
    edgePtsR.push({
      x: coreX - Math.cos(perpAngle) * finalWidth,
      y: coreY - Math.sin(perpAngle) * finalWidth
    });
  }

  // 2. DRAW SHADOW LAYER (Occlusion)
  graphics.beginPath();
  graphics.moveTo(x, y);
  for (const p of edgePtsL) graphics.lineTo(p.x, p.y);
  for (let i = edgePtsR.length - 1; i >= 0; i--) graphics.lineTo(edgePtsR[i].x, edgePtsR[i].y);
  graphics.closePath();
  graphics.fill({ color: darken(color, 0.4), alpha: 0.3 });

  // 3. DRAW MAIN BODY
  graphics.beginPath();
  graphics.moveTo(x, y);
  for (const p of edgePtsL) graphics.lineTo(p.x, p.y);
  for (let i = edgePtsR.length - 1; i >= 0; i--) graphics.lineTo(edgePtsR[i].x, edgePtsR[i].y);
  graphics.closePath();
  graphics.fill({ color });

  // 4. DRAW MIDTONE GRADIENT (Leaf Fold)
  graphics.beginPath();
  graphics.moveTo(x, y);
  for (const p of edgePtsL) graphics.lineTo(p.x, p.y);
  graphics.lineTo(tipX, tipY);
  graphics.closePath();
  graphics.fill({ color: darken(color, 0.15), alpha: 0.4 });

  // 5. DRAW INTRICATE VENATION
  graphics.beginPath();
  // Main stem (Midrib)
  graphics.moveTo(x, y);
  graphics.lineTo(tipX, tipY);

  // Secondary veins
  const veinCount = 5;
  for (let i = 1; i < veinCount; i++) {
    const t = i / veinCount;
    const vStartX = x + (tipX - x) * t;
    const vStartY = y + (tipY - y) * t;

    const vIdx = Math.floor(t * edgeSegments);
    const targetL = edgePtsL[vIdx];
    const targetR = edgePtsR[vIdx];

    // Branching veins with curve
    graphics.moveTo(vStartX, vStartY);
    graphics.quadraticCurveTo(
      vStartX + Math.cos(perpAngle) * width * 0.3, vStartY + Math.sin(perpAngle) * width * 0.3,
      targetL.x, targetL.y
    );
    graphics.moveTo(vStartX, vStartY);
    graphics.quadraticCurveTo(
      vStartX - Math.cos(perpAngle) * width * 0.3, vStartY - Math.sin(perpAngle) * width * 0.3,
      targetR.x, targetR.y
    );
  }
  graphics.stroke({ width: 0.8, color: darken(color, 0.35), alpha: 0.7, cap: 'round' });

  // 6. WAXY HIGHLIGHT (Central shine)
  graphics.beginPath();
  graphics.moveTo(x + (tipX - x) * 0.1, y + (tipY - y) * 0.1);
  graphics.lineTo(x + (tipX - x) * 0.6, y + (tipY - y) * 0.6);
  graphics.stroke({ width: 1.2, color: lighten(color, 0.4), alpha: 0.25, cap: 'round' });
}

/**
 * Draws a sharp, procedural thorn along the vine.
 */
export function drawThorn(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: number = VineColors.main
): void {
  const h = size * 2.0;
  const w = size * 1.1;

  const tipX = x + Math.cos(angle) * h;
  const tipY = y + Math.sin(angle) * h;
  const perp = angle + Math.PI / 2;

  const base1X = x + Math.cos(perp) * w * 0.45;
  const base1Y = y + Math.sin(perp) * w * 0.45;
  const base2X = x - Math.cos(perp) * w * 0.45;
  const base2Y = y - Math.sin(perp) * w * 0.45;

  graphics.beginPath();
  graphics.moveTo(base1X, base1Y);
  // Sharporganic curve
  graphics.quadraticCurveTo(x + Math.cos(angle) * h * 0.1, y + Math.sin(angle) * h * 0.1, tipX, tipY);
  graphics.quadraticCurveTo(x + Math.cos(angle) * h * 0.1, y + Math.sin(angle) * h * 0.1, base2X, base2Y);
  graphics.closePath();

  graphics.fill({ color: darken(color, 0.2) });
  graphics.stroke({ width: 1.5, color: VineColors.dark, alpha: 1.0 });
}

export function drawTendril(
  graphics: Graphics,
  x: number,
  y: number,
  length: number,
  angle: number,
  curls: number = 2,
  curlSign: number = 1
): void {
  const segments = 50;
  const baseWidth = 1.6;

  // 1. Pre-calculate the Pigtail Path
  const pts: { x: number; y: number; t: number }[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Organic spiral math: radius swells slightly then dampens towards the tip
    const spiralRadius = length * 0.28 * Math.sin(t * Math.PI * 0.8);
    const spiralAngle = angle + t * Math.PI * (curls * 1.5) * curlSign;

    // Main progression along the natural growth vector
    const mainDist = length * t;

    pts.push({
      x: x + Math.cos(angle) * mainDist * 0.75 + Math.cos(spiralAngle) * spiralRadius,
      y: y + Math.sin(angle) * mainDist * 0.75 + Math.sin(spiralAngle) * spiralRadius,
      t
    });
  }

  // 2. Draw Soft Occlusion Shadow (one continuous stroke for performance)
  graphics.beginPath();
  graphics.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    graphics.lineTo(pts[i].x, pts[i].y);
  }
  graphics.stroke({ width: baseWidth + 1.5, color: VineColors.dark, alpha: 0.2, cap: 'round', join: 'round' });

  // 3. Draw Tapered Main Core (Segmented for width control)
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];

    // Exponential tapering for sharp, elegant tips
    const thickness = baseWidth * Math.pow(1 - p1.t, 1.1);
    const color = lerpColor(VineColors.leaf, VineColors.main, p1.t * 0.5);

    graphics.beginPath();
    graphics.moveTo(p1.x, p1.y);
    graphics.lineTo(p2.x, p2.y);
    graphics.stroke({ width: Math.max(0.3, thickness), color, cap: 'round', join: 'round' });
  }
}

/**
 * Bakes a tendril to a RenderTexture for caching.
 * Draws the tendril once at origin (0,0) facing right (angle=0).
 * Caller should apply rotation and position via sprite transforms.
 */
export function bakeTendrilTexture(
  renderer: Renderer,
  length: number,
  curls: number = 2,
  curlSign: number = 1
): Texture {
  const tempGraphics = new Graphics();

  // Calculate bounds for the tendril
  const padding = length * 0.5;
  const size = length + padding * 2;

  // Draw at center of texture, facing right (angle = 0)
  drawTendril(tempGraphics, padding, size / 2, length, 0, curls, curlSign);

  const texture = renderer.generateTexture({
    target: tempGraphics,
    resolution: 1,
  });

  tempGraphics.destroy();
  return texture;
}

export function drawPetal(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  const w = size * 1.5;
  const h = size * 1.0;
  graphics.beginPath();
  graphics.ellipse(x, y, w * 0.5, h * 0.5);
  graphics.fill({ color });
  graphics.stroke({ width: 0.5, color: darken(color, 0.2), alpha: 0.5 });
}

export function drawFlowerShadow(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  alphaMultiplier: number = 1
): void {
  const shadowColor = 0x000000;
  const layers = 8; // Soft layering

  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    // Tighter spread: max 1.2x size for clean garden density
    const layerSize = size * (0.85 + t * 0.35);

    // Very subtle alpha
    const alpha = 0.04 * (1 - t) * alphaMultiplier;

    // Minimal Y-offset for grounded look
    const offsetY = size * 0.1;

    graphics.beginPath();
    graphics.circle(x, y + offsetY, layerSize);
    graphics.fill({ color: shadowColor, alpha: Math.max(0, alpha) });
  }
}

export function drawHeart(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  const s = size * 0.8;

  // 1. Base (Darker Edge)
  graphics.beginPath();
  renderHeartPath(graphics, x, y, s);
  graphics.fill({ color });

  // 2. Inner (Lighter Body) - Creates "Two-Tone" shading
  // Scale down slightly for the inner fill
  const innerS = s * 0.7;
  const innerColor = lighten(color, 0.3); // Visible contrast

  graphics.beginPath();
  renderHeartPath(graphics, x, y - (s - innerS) * 0.2, innerS); // Slight Y offset to center visually
  graphics.fill({ color: innerColor });
}

/** Helper for plumper, lush heart geometry */
function renderHeartPath(graphics: Graphics, x: number, y: number, s: number): void {
  // Shallower dip at top-center (Moved up from +0.2 to -0.05)
  graphics.moveTo(x, y - s * 0.05);

  // Left lobe (Plump and high)
  graphics.bezierCurveTo(x - s * 0.5, y - s * 0.8, x - s * 1.2, y - s * 0.4, x - s * 1.2, y + s * 0.3);

  // Left bottom to sharp point
  graphics.bezierCurveTo(x - s * 1.2, y + s * 0.7, x - s * 0.2, y + s * 1.1, x, y + s * 1.3);

  // Right bottom from sharp point
  graphics.bezierCurveTo(x + s * 0.2, y + s * 1.1, x + s * 1.2, y + s * 0.7, x + s * 1.2, y + s * 0.3);

  // Right lobe (Plump and high)
  graphics.bezierCurveTo(x + s * 1.2, y - s * 0.4, x + s * 0.5, y - s * 0.8, x, y - s * 0.05);
}
