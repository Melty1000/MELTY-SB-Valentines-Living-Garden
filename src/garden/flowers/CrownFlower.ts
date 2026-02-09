import { Container, Graphics } from 'pixi.js';
import { drawRose, drawHeart, drawFlowerShadow } from '../../utils/procedural';
import { FlowerColors } from '../../utils/colors';
import { noise } from '../../utils/math';
import { config } from '../../config';

export type CrownType = 'rose' | 'heart';

export class CrownFlower extends Container {
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private type: CrownType;
  private size: number;
  private color: number;
  private timeOffset: number;
  private pulsePhase: number = 0;

  constructor(type: CrownType = 'rose', size: number = 20, color: number = FlowerColors.rose) {
    super();
    this.type = type;
    this.size = size;
    this.color = color;
    this.timeOffset = Math.random() * 1000;

    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();

    this.addChild(this.glowGraphics);
    this.addChild(this.graphics);

    this.draw();
  }

  update(time: number, deltaTime: number, windOffset: number = 0): void {
    const t = time + this.timeOffset;
    const sway = noise(t * config.vine.swaySpeed * 0.3, 0) * 0.03;
    const wind = windOffset * 0.005;
    this.rotation = sway + wind;

    this.pulsePhase += deltaTime * 0.8;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.02;
    this.scale.set(pulse);
    this.updateGlow();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();
    const glowIntensity = 0.15 + Math.sin(this.pulsePhase) * 0.05;
    const glowColor = this.color;

    for (let i = 3; i >= 0; i--) {
      const layerSize = this.size * (0.8 + i * 0.15);
      const alpha = glowIntensity * (0.08 - i * 0.015);
      this.glowGraphics.circle(0, 0, layerSize);
      this.glowGraphics.fill({ color: glowColor, alpha });
    }
  }

  private draw(): void {
    this.graphics.clear();
    drawFlowerShadow(this.graphics, 0, 0, this.size * 1.3, 2.0);
    if (this.type === 'heart') {
      drawHeart(this.graphics, 0, 0, this.size, this.color);
    } else {
      drawRose(this.graphics, 0, 0, this.size, this.color);
    }
  }

  setType(type: CrownType): void { this.type = type; this.draw(); }
  setColor(color: number): void { this.color = color; this.draw(); }

  override destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
