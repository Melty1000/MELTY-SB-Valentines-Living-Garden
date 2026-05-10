import { Container, Graphics } from 'pixi.js';
import { drawHeart } from '../utils/procedural';
import { EffectColors } from '../utils/colors';
import { noise } from '../utils/math';
import { config } from '../config';

export interface HeartData {
  userId: string;
  userName: string;
  tier: string;
}

export class GlowingHeart extends Container {
  private graphics: Graphics;
  private glowGraphics: Graphics;
  private data: HeartData;
  private size: number;
  private baseY: number = 0;
  private timeOffset: number;
  private pulsePhase: number = 0;
  private color: number;

  constructor(data: HeartData, size: number = config.heart.size) {
    super();
    this.data = data;
    this.size = size;
    this.timeOffset = Math.random() * 1000;
    this.color = this.getColorForTier(data.tier);

    this.glowGraphics = new Graphics();
    this.graphics = new Graphics();

    this.addChild(this.glowGraphics);
    this.addChild(this.graphics);

    this.draw();
  }

  private getColorForTier(tier: string): number {
    switch (tier) {
      case '3000':
        return EffectColors.sparkleGold;
      case '2000':
        return EffectColors.heartPink;
      default:
        return EffectColors.heartRed;
    }
  }

  attachToPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.baseY = y;
  }

  update(deltaTime: number, windOffset: number = 0): void {
    const time = performance.now() * 0.001 + this.timeOffset;

    const floatOffset =
      Math.sin(time * config.heart.floatSpeed) * config.heart.floatAmount;
    this.y = this.baseY + floatOffset;

    const windSway = windOffset * 0.01;
    this.rotation = windSway + noise(time, 0) * 0.1;

    this.pulsePhase += deltaTime * 0.003;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
    this.scale.set(pulse);

    this.updateGlow();
  }

  private updateGlow(): void {
    this.glowGraphics.clear();

    const glowSize = this.size * 1.5;
    const intensity = config.heart.glowIntensity * (0.5 + Math.sin(this.pulsePhase) * 0.5);

    for (let i = 3; i >= 0; i--) {
      const layerSize = glowSize * (1 + i * 0.2);
      const alpha = intensity * (0.15 - i * 0.03);

      this.glowGraphics.beginPath();
      drawHeart(this.glowGraphics, 0, 0, layerSize, this.color);
      this.glowGraphics.fill({ color: this.color, alpha });
    }
  }

  private draw(): void {
    this.graphics.clear();
    drawHeart(this.graphics, 0, 0, this.size, this.color);

    const highlightSize = this.size * 0.3;
    const highlightX = -this.size * 0.15;
    const highlightY = -this.size * 0.1;
    this.graphics.circle(highlightX, highlightY, highlightSize);
    this.graphics.fill({ color: 0xffffff, alpha: 0.3 });
  }

  getUserId(): string {
    return this.data.userId;
  }

  destroy(): void {
    this.graphics.destroy();
    this.glowGraphics.destroy();
    super.destroy();
  }
}
