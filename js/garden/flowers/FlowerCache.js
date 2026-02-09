import { Graphics, Texture, Renderer } from 'pixi.js';
import { drawSeed, drawBud, drawRose } from '../../utils/procedural.js';

export enum CacheType {
    Seed = 'seed',
    Bud = 'bud',
    Rose = 'rose',
    Glow = 'glow'
}

export class FlowerCache {
  static textures = new Map();
  static tempGraphics = new Graphics();

    /**
     * Generates or retrieves a cached texture for a flower stage.
     */
  static getTexture(
        renderer,
        type,
        size,
        color,
        openness = 1
    ) {
        // Generate a key based on attributes
        // Reverted Optimization: We use specific colors to preserve white highlights/gradients.
        const key = `${type}_${color}_${size.toFixed(0)}_${openness.toFixed(1)}`;

        if (this.textures.has(key)) {
            return this.textures.get(key)!;
        }

        // Draw to temp graphics
        this.tempGraphics.clear();
        switch (type) {
            case CacheType.Seed:
                drawSeed(this.tempGraphics, size, size, size, color);
                break;
            case CacheType.Bud:
                drawBud(this.tempGraphics, size, size, size, color);
                break;
            case CacheType.Rose:
                drawRose(this.tempGraphics, size, size, size, color, openness);
                break;
            case CacheType.Glow:
                this.tempGraphics.circle(size, size, size * 2.2);
                this.tempGraphics.fill({ color, alpha: 0.15 });
                break;
        }

        // Create texture
        // Add padding to prevent clipping
        const tex = renderer.generateTexture({
            target: this.tempGraphics,
            resolution,
        });

        this.textures.set(key, tex);
        return tex;
    }
  static clear() {
        this.textures.forEach(t => t.destroy(true));
        this.textures.clear();
    }
}
