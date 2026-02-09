import { Container, Graphics } from 'pixi.js';
import { drawHeart } from '../../utils/procedural.js';
import { EffectColors } from '../../utils/colors.js';
import { config } from '../../config.js';

export class GlowingHeart extends Container {
  graphics;
  data;
  size;

  constructor(data, size = config.heart.size * 0.6) {
    super();
    this.data = data;
    this.size = size;

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    // Narrower shape (0.8 width)
    this.graphics.scale.set(0.8, 1.0);

    this.draw();
  }
  getColorForTier(tier) {
    switch (tier) {
      case '3000': return EffectColors.sparkleGold;
      case '2000': return EffectColors.heartPink;
      default: return EffectColors.heartRed;
    }
  }

  attachToPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  update(_deltaTime, windOffset = 0) {
    this.rotation = windOffset * 0.015;
  }
  draw() {
    this.graphics.clear();
    const color = this.getColorForTier(this.data.tier);
    drawHeart(this.graphics, 0, 0, this.size, color);
  }

  getUserId() { return this.data.userId; }

  destroy() {
    this.graphics.destroy();
    super.destroy();
  }
}
