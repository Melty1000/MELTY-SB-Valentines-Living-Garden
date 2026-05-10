import { Graphics } from 'pixi.js';
import { randomRange } from './math';
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

export function generateFlowerShape(color: number, size: number): FlowerShape {
  return {
    petalCount: Math.floor(randomRange(5, 9)),
    petalLength: size * randomRange(0.6, 0.9),
    petalWidth: size * randomRange(0.25, 0.4),
    centerSize: size * randomRange(0.2, 0.35),
    color: color,
    centerColor: darken(color, 0.3),
  };
}

// Draw a realistic rose with wrapped, overlapping petals
export function drawRose(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  baseColor: number = FlowerColors.rose
): void {
  // Rose structure: outer petals drawn first (background), inner last (foreground)
  // Each ring has petals that wrap around the center

  const rings = [
    { count: 5, radius: size * 0.85, petalSize: size * 0.45, rotation: 0 },
    { count: 5, radius: size * 0.62, petalSize: size * 0.38, rotation: 0.35 },
    { count: 5, radius: size * 0.42, petalSize: size * 0.30, rotation: 0.7 },
    { count: 4, radius: size * 0.25, petalSize: size * 0.22, rotation: 0.4 },
  ];

  // Draw from outer ring to inner
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    const ringT = r / (rings.length - 1);

    // Outer petals are darker/more shadowed, inner are lighter
    const petalColor = lerpColor(darken(baseColor, 0.15), lighten(baseColor, 0.1), ringT);
    const shadowColor = darken(petalColor, 0.2);
    const highlightColor = lighten(petalColor, 0.15);

    for (let i = 0; i < ring.count; i++) {
      const angle = (i / ring.count) * Math.PI * 2 + ring.rotation;

      // Petal center point (where petal attaches)
      const attachDist = ring.radius * 0.3;
      const attachX = x + Math.cos(angle) * attachDist;
      const attachY = y + Math.sin(angle) * attachDist;

      // Petal tip point
      const tipDist = ring.radius;
      const tipX = x + Math.cos(angle) * tipDist;
      const tipY = y + Math.sin(angle) * tipDist;

      // Petal width at widest point
      const petalWidth = ring.petalSize * 0.7;

      // Draw petal as a cupped/curved shape
      // Left and right edges curve outward then back in to tip
      const perpAngle = angle + Math.PI / 2;

      // Control points for the petal shape
      // Base left/right
      const baseLeftX = attachX + Math.cos(perpAngle) * petalWidth * 0.2;
      const baseLeftY = attachY + Math.sin(perpAngle) * petalWidth * 0.2;
      const baseRightX = attachX - Math.cos(perpAngle) * petalWidth * 0.2;
      const baseRightY = attachY - Math.sin(perpAngle) * petalWidth * 0.2;

      // Mid bulge (widest part of petal)
      const midDist = attachDist + (tipDist - attachDist) * 0.5;
      const midLeftX = x + Math.cos(angle) * midDist + Math.cos(perpAngle) * petalWidth;
      const midLeftY = y + Math.sin(angle) * midDist + Math.sin(perpAngle) * petalWidth;
      const midRightX = x + Math.cos(angle) * midDist - Math.cos(perpAngle) * petalWidth;
      const midRightY = y + Math.sin(angle) * midDist - Math.sin(perpAngle) * petalWidth;

      // Near tip (curves back in)
      const nearTipDist = attachDist + (tipDist - attachDist) * 0.85;
      const nearTipLeftX = x + Math.cos(angle) * nearTipDist + Math.cos(perpAngle) * petalWidth * 0.4;
      const nearTipLeftY = y + Math.sin(angle) * nearTipDist + Math.sin(perpAngle) * petalWidth * 0.4;
      const nearTipRightX = x + Math.cos(angle) * nearTipDist - Math.cos(perpAngle) * petalWidth * 0.4;
      const nearTipRightY = y + Math.sin(angle) * nearTipDist - Math.sin(perpAngle) * petalWidth * 0.4;

      // Draw main petal shape
      graphics.beginPath();
      graphics.moveTo(attachX, attachY);
      // Left edge: base -> bulge -> tip
      graphics.bezierCurveTo(baseLeftX, baseLeftY, midLeftX, midLeftY, nearTipLeftX, nearTipLeftY);
      graphics.quadraticCurveTo(tipX, tipY, nearTipRightX, nearTipRightY);
      // Right edge: tip -> bulge -> base
      graphics.bezierCurveTo(midRightX, midRightY, baseRightX, baseRightY, attachX, attachY);
      graphics.fill({ color: petalColor });

      // Add shadow on one side for depth
      graphics.beginPath();
      graphics.moveTo(attachX, attachY);
      graphics.bezierCurveTo(baseRightX, baseRightY, midRightX, midRightY, nearTipRightX, nearTipRightY);
      graphics.lineTo(tipX, tipY);
      graphics.quadraticCurveTo(
        x + Math.cos(angle) * (midDist + tipDist) * 0.5,
        y + Math.sin(angle) * (midDist + tipDist) * 0.5,
        attachX, attachY
      );
      graphics.fill({ color: shadowColor, alpha: 0.35 });

      // Add highlight on the other side
      graphics.beginPath();
      graphics.moveTo(
        attachX + Math.cos(perpAngle) * petalWidth * 0.1,
        attachY + Math.sin(perpAngle) * petalWidth * 0.1
      );
      graphics.quadraticCurveTo(
        midLeftX * 0.7 + tipX * 0.3,
        midLeftY * 0.7 + tipY * 0.3,
        nearTipLeftX, nearTipLeftY
      );
      graphics.lineTo(tipX, tipY);
      graphics.quadraticCurveTo(
        x + Math.cos(angle) * midDist + Math.cos(perpAngle) * petalWidth * 0.3,
        y + Math.sin(angle) * midDist + Math.sin(perpAngle) * petalWidth * 0.3,
        attachX + Math.cos(perpAngle) * petalWidth * 0.1,
        attachY + Math.sin(perpAngle) * petalWidth * 0.1
      );
      graphics.fill({ color: highlightColor, alpha: 0.25 });
    }
  }

  // Draw the tight center bud (spiral of tiny petals)
  const centerColor = darken(baseColor, 0.1);
  const centerDark = darken(baseColor, 0.3);

  // Inner spiral petals
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.5;
    const dist = size * 0.08;
    const petalSize = size * 0.12;

    const cx = x + Math.cos(angle) * dist;
    const cy = y + Math.sin(angle) * dist;
    const tipX = x + Math.cos(angle) * (dist + petalSize);
    const tipY = y + Math.sin(angle) * (dist + petalSize);

    graphics.beginPath();
    graphics.moveTo(cx, cy);
    graphics.quadraticCurveTo(
      cx + Math.cos(angle + 0.8) * petalSize * 0.6,
      cy + Math.sin(angle + 0.8) * petalSize * 0.6,
      tipX, tipY
    );
    graphics.quadraticCurveTo(
      cx + Math.cos(angle - 0.8) * petalSize * 0.6,
      cy + Math.sin(angle - 0.8) * petalSize * 0.6,
      cx, cy
    );
    graphics.fill({ color: i % 2 === 0 ? centerColor : lighten(centerColor, 0.1) });
  }

  // Very center dot
  graphics.circle(x, y, size * 0.05);
  graphics.fill({ color: centerDark });
}

export function drawFlower(
  graphics: Graphics,
  x: number,
  y: number,
  shape: FlowerShape,
  openness: number = 1
): void {
  const { petalCount, petalLength, petalWidth, centerSize, color, centerColor } = shape;
  const adjustedPetalLength = petalLength * openness;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
    const petalX = x + Math.cos(angle) * adjustedPetalLength * 0.5;
    const petalY = y + Math.sin(angle) * adjustedPetalLength * 0.5;

    graphics.ellipse(petalX, petalY, petalWidth * 0.5, adjustedPetalLength * 0.5);
    graphics.fill({ color: lighten(color, 0.1) });

    graphics.ellipse(petalX, petalY, petalWidth * 0.4, adjustedPetalLength * 0.45);
    graphics.fill({ color });
  }

  graphics.circle(x, y, centerSize);
  graphics.fill({ color: centerColor });
}

export function drawBud(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  graphics.ellipse(x, y, size * 0.3, size * 0.5);
  graphics.fill({ color: darken(color, 0.2) });

  graphics.ellipse(x - size * 0.1, y - size * 0.1, size * 0.2, size * 0.35);
  graphics.fill({ color });
}

export function drawSeed(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  graphics.circle(x, y, size * 0.15);
  graphics.fill({ color: darken(color, 0.3) });
}

// Draw a proper leaf with veins
export function drawLeaf(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  angle: number,
  color: number = VineColors.leaf
): void {
  const width = size * 0.4;

  // Main leaf shape
  graphics.beginPath();
  graphics.moveTo(x, y);

  const tipX = x + Math.cos(angle) * size;
  const tipY = y + Math.sin(angle) * size;

  const perpAngle = angle + Math.PI / 2;

  // Left side curve
  const leftCtrl1X = x + Math.cos(angle) * size * 0.25 + Math.cos(perpAngle) * width * 0.8;
  const leftCtrl1Y = y + Math.sin(angle) * size * 0.25 + Math.sin(perpAngle) * width * 0.8;
  const leftCtrl2X = x + Math.cos(angle) * size * 0.7 + Math.cos(perpAngle) * width * 0.4;
  const leftCtrl2Y = y + Math.sin(angle) * size * 0.7 + Math.sin(perpAngle) * width * 0.4;

  graphics.bezierCurveTo(leftCtrl1X, leftCtrl1Y, leftCtrl2X, leftCtrl2Y, tipX, tipY);

  // Right side curve
  const rightCtrl1X = x + Math.cos(angle) * size * 0.7 - Math.cos(perpAngle) * width * 0.4;
  const rightCtrl1Y = y + Math.sin(angle) * size * 0.7 - Math.sin(perpAngle) * width * 0.4;
  const rightCtrl2X = x + Math.cos(angle) * size * 0.25 - Math.cos(perpAngle) * width * 0.8;
  const rightCtrl2Y = y + Math.sin(angle) * size * 0.25 - Math.sin(perpAngle) * width * 0.8;

  graphics.bezierCurveTo(rightCtrl1X, rightCtrl1Y, rightCtrl2X, rightCtrl2Y, x, y);

  graphics.fill({ color });

  // Center vein
  graphics.moveTo(x, y);
  graphics.lineTo(tipX, tipY);
  graphics.stroke({ width: 1, color: darken(color, 0.25) });

  // Side veins
  for (let i = 1; i <= 3; i++) {
    const t = i * 0.22;
    const veinStartX = x + Math.cos(angle) * size * t;
    const veinStartY = y + Math.sin(angle) * size * t;
    const veinLen = width * (1 - t * 0.5) * 0.6;

    // Left vein
    const leftVeinAngle = angle + Math.PI * 0.35;
    graphics.moveTo(veinStartX, veinStartY);
    graphics.lineTo(
      veinStartX + Math.cos(leftVeinAngle) * veinLen,
      veinStartY + Math.sin(leftVeinAngle) * veinLen
    );

    // Right vein
    const rightVeinAngle = angle - Math.PI * 0.35;
    graphics.moveTo(veinStartX, veinStartY);
    graphics.lineTo(
      veinStartX + Math.cos(rightVeinAngle) * veinLen,
      veinStartY + Math.sin(rightVeinAngle) * veinLen
    );
  }
  graphics.stroke({ width: 0.5, color: darken(color, 0.2), alpha: 0.6 });
}

// Draw a curling tendril
export function drawTendril(
  graphics: Graphics,
  x: number,
  y: number,
  length: number,
  angle: number,
  curls: number = 2
): void {
  graphics.beginPath();
  graphics.moveTo(x, y);

  const segments = 20;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const curlAngle = angle + t * Math.PI * curls * (Math.random() > 0.5 ? 1 : -1);
    const dist = length * t;
    const dampening = 1 - t * 0.7; // Curls get tighter at end

    const px = x + Math.cos(angle) * dist * 0.7 + Math.cos(curlAngle) * dist * 0.3 * dampening;
    const py = y + Math.sin(angle) * dist * 0.7 + Math.sin(curlAngle) * dist * 0.3 * dampening;

    graphics.lineTo(px, py);
  }

  graphics.stroke({
    width: 2,
    color: VineColors.tendril,
    cap: 'round',
    alpha: 0.8
  });
}

export function drawHeart(
  graphics: Graphics,
  x: number,
  y: number,
  size: number,
  color: number
): void {
  const s = size * 0.5;

  graphics.moveTo(x, y + s * 0.3);
  graphics.bezierCurveTo(x, y - s * 0.5, x - s, y - s * 0.5, x - s, y + s * 0.1);
  graphics.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
  graphics.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
  graphics.bezierCurveTo(x + s, y - s * 0.5, x, y - s * 0.5, x, y + s * 0.3);
  graphics.fill({ color });
}
