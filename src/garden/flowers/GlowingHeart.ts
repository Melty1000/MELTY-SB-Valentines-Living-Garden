import { Container, Graphics } from 'pixi.js';
import { drawHeart } from '../../utils/procedural';
import { EffectColors } from '../../utils/colors';
import { config } from '../../config';

export interface HeartData {
  userId: string;
  userName: string;
  tier: string;
}

export class GlowingHeart extends Container {
  private graphics: Graphics;
  private data: HeartData;
  private size: number;

  constructor(data: HeartData, size: number = config.heart.size * 0.6) {
    super();
    this.data = data;
    this.size = size;

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    // Narrower shape (0.8 width)
    this.graphics.scale.set(0.8, 1.0);

    this.draw();
  }

  private getColorForTier(tier: string): number {
    switch (tier) {
      case '3000': return EffectColors.sparkleGold;
      case '2000': return EffectColors.heartPink;
      default: return EffectColors.heartRed;
    }
  }

  attachToPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  update(_deltaTime: number, windOffset: number = 0): void {
    this.rotation = windOffset * 0.015;
  }

  private draw(): void {
    this.graphics.clear();
    const color = this.getColorForTier(this.data.tier);
    drawHeart(this.graphics, 0, 0, this.size, color);
  }

  getUserId(): string { return this.data.userId; }

  destroy(): void {
    this.graphics.destroy();
    super.destroy();
  }
}
