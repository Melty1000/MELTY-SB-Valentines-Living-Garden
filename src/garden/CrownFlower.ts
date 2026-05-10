import { Container, Graphics } from 'pixi.js';
import { drawRose, drawHeart, drawLeaf } from '../utils/procedural';
import { FlowerColors, VineColors } from '../utils/colors';
import { noise } from '../utils/math';
import { config } from '../config';

export type CrownType = 'rose' | 'heart';

export class CrownFlower extends Container {
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private type: CrownType;
  private size: number;
  private timeOffset: number;
  private pulsePhase: number = 0;

  constructor(type: CrownType = 'rose', size: number = 35) {
    super();
    this.type = type;
    this.size = size;
    this.timeOffset = Math.random() * 1000;

    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();

    this.addChild(this.glowGraphics);
    this.addChild(this.graphics);

    this.draw();
  }

  update(deltaTime: number, windOffset: number = 0): void {
    const time = performance.now() * 0.001 + this.timeOffset;

    // Very subtle sway
    const sway = noise(time * config.vine.swaySpeed * 0.3, 0) * 0.03;
    const wind = windOffset * 0.005;
    this.rotation = sway + wind;

    // Subtle pulse
    this.pulsePhase += deltaTime * 0.0008;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.02;
    this.scale.set(pulse);

    this.updateGlow();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();

    // Subtle glow behind the flower
    const glowIntensity = 0.15 + Math.sin(this.pulsePhase) * 0.05;

    for (let i = 3; i >= 0; i--) {
      const layerSize = this.size * (0.8 + i * 0.15);
      const alpha = glowIntensity * (0.08 - i * 0.015);

      this.glowGraphics.circle(0, 0, layerSize);
      this.glowGraphics.fill({ color: FlowerColors.roseLight, alpha });
    }
  }

  private draw(): void {
    this.graphics.clear();

    if (this.type === 'heart') {
      drawHeart(this.graphics, 0, 0, this.size, FlowerColors.rose);

      // Highlight
      this.graphics.circle(-this.size * 0.12, -this.size * 0.08, this.size * 0.12);
      this.graphics.fill({ color: 0xffffff, alpha: 0.25 });
    } else {
      // Draw stem behind rose
      this.graphics.beginPath();
      this.graphics.moveTo(0, this.size * 0.3);
      this.graphics.lineTo(0, this.size * 0.8);
      this.graphics.stroke({ width: 3, color: VineColors.stem, cap: 'round' });

      // Draw small leaves on stem
      drawLeaf(this.graphics, 0, this.size * 0.5, 10, Math.PI * 0.3, VineColors.leaf);
      drawLeaf(this.graphics, 0, this.size * 0.5, 10, Math.PI * 0.7, VineColors.leaf);

      // Draw the rose
      drawRose(this.graphics, 0, 0, this.size, FlowerColors.rose);
    }
  }

  setType(type: CrownType): void {
    this.type = type;
    this.draw();
  }

  override destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
