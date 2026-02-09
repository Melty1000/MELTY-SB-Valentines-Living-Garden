import { Graphics, Renderer, Texture } from 'pixi.js';
import { drawLeaf, drawThorn } from '../../utils/procedural.js';
import { VineColors } from '../../utils/colors.js';

export enum FoliageType {
    Leaf = 'leaf',
    Thorn = 'thorn'
}

export class FoliageCache {
  static textures = new Map();
  static tempGraphics = new Graphics();

    /**
     * Generates or retrieves a cached texture for vine foliage.
     */
  static getTexture(
        renderer,
        type,
        size,
        angle = 0,
        color?: number
    ) {
        // Only use type and size for the key to maximize reuse
        // Rotation is handled by the Sprite itself
        const key = `${type}_${size.toFixed(1)}${color ? `_${color}` : ''}`;

        if (this.textures.has(key)) {
            return this.textures.get(key)!;
        }

        this.tempGraphics.clear();

        // Position the drawing at (size, size) with enough padding
        const padding = size * 1.5;

        if (type === FoliageType.Leaf) {
            // Draw at 0 angle for the texture, let Sprite handle rotation
            drawLeaf(this.tempGraphics, padding, padding, size, 0, color || VineColors.leaf);
        } else {
            drawThorn(this.tempGraphics, padding, padding, size, 0, color || VineColors.main);
        }

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
