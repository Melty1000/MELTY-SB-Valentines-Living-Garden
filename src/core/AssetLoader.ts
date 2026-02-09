import { Texture, Graphics, RenderTexture, Renderer } from 'pixi.js';

export class AssetLoader {
  private textures: Map<string, Texture> = new Map();
  private renderer: Renderer | null = null;

  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }

  async loadAssets(): Promise<void> {
    // For now, we use procedural textures
    // Future: load sprite assets from public/assets/
    console.log('[AssetLoader] Using procedural textures');
  }

  getTexture(name: string): Texture | undefined {
    return this.textures.get(name);
  }

  createCircleTexture(radius: number, color: number): Texture {
    const key = `circle_${radius}_${color}`;
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    const graphics = new Graphics();
    graphics.circle(radius, radius, radius);
    graphics.fill({ color });

    const texture = this.graphicsToTexture(graphics, radius * 2, radius * 2);
    this.textures.set(key, texture);
    return texture;
  }

  createHeartTexture(size: number, color: number): Texture {
    const key = `heart_${size}_${color}`;
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    const graphics = new Graphics();
    const x = size / 2;
    const y = size / 2;
    const s = size * 0.3;

    graphics.moveTo(x, y + s * 0.3);
    graphics.bezierCurveTo(x, y - s * 0.5, x - s, y - s * 0.5, x - s, y + s * 0.1);
    graphics.bezierCurveTo(x - s, y + s * 0.6, x, y + s, x, y + s);
    graphics.bezierCurveTo(x, y + s, x + s, y + s * 0.6, x + s, y + s * 0.1);
    graphics.bezierCurveTo(x + s, y - s * 0.5, x, y - s * 0.5, x, y + s * 0.3);
    graphics.fill({ color });

    const texture = this.graphicsToTexture(graphics, size, size);
    this.textures.set(key, texture);
    return texture;
  }

  createSparkleTexture(size: number, color: number): Texture {
    const key = `sparkle_${size}_${color}`;
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }

    const graphics = new Graphics();
    const cx = size / 2;
    const cy = size / 2;
    const outerRadius = size * 0.45;
    const innerRadius = size * 0.15;
    const points = 4;

    graphics.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < points; i++) {
      const outerAngle = (i * Math.PI * 2) / points - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / points;

      graphics.lineTo(
        cx + Math.cos(outerAngle) * outerRadius,
        cy + Math.sin(outerAngle) * outerRadius
      );
      graphics.lineTo(
        cx + Math.cos(innerAngle) * innerRadius,
        cy + Math.sin(innerAngle) * innerRadius
      );
    }
    graphics.closePath();
    graphics.fill({ color });

    const texture = this.graphicsToTexture(graphics, size, size);
    this.textures.set(key, texture);
    return texture;
  }

  private graphicsToTexture(graphics: Graphics, width: number, height: number): Texture {
    if (!this.renderer) {
      console.warn('[AssetLoader] Renderer not set, returning empty texture');
      return Texture.EMPTY;
    }

    const renderTexture = RenderTexture.create({ width, height });
    this.renderer.render({ container: graphics, target: renderTexture });
    return renderTexture;
  }

  destroy(): void {
    this.textures.forEach((texture) => texture.destroy());
    this.textures.clear();
  }
}

export const assetLoader = new AssetLoader();
