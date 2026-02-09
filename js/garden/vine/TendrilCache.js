import { Renderer, Sprite, Texture } from 'pixi.js';
import { bakeTendrilTexture } from '../../utils/procedural.js';
import { TwigData } from './VineTypes.js';

/**
 * Caches baked tendril textures to avoid per-frame drawing.
 * Tendrils are static after generation — drawn once, displayed.
 */
export class TendrilCache {
  static textures = new Map();

    /**
     * Gets or creates a cached tendril texture.
     * Key is based on length, curls, and curlSign (angle is handled by sprite rotation).
     */
  static getTexture(
        renderer,
        length,
        curls,
        curlSign
    ) {
        // Round length to nearest 5 for better cache reuse
        const roundedLength = Math.round(length / 5) * 5;
        const key = `tendril_${roundedLength}_${curls}_${curlSign}`;

        if (this.textures.has(key)) {
            return this.textures.get(key)!;
        }

        const texture = bakeTendrilTexture(renderer, roundedLength, curls, curlSign);
        this.textures.set(key, texture);
        return texture;
    }

    /**
     * Creates a sprite for a twig at the given anchor position.
     */
  static createSprite(
        renderer,
        twig,
        x,
        y,
        angle
    ) {
        const texture = this.getTexture(renderer, twig.length, twig.curls, twig.curlSign);
        const sprite = new Sprite(texture);

        // Anchor at the base of the tendril (left-center of texture)
        sprite.anchor.set(0, 0.5);
        sprite.position.set(x, y);
        sprite.rotation = angle;

        return sprite;
    }

    /**
     * Clears all cached textures. Call on resize or cleanup.
     */
  static clear() {
        this.textures.forEach(t => t.destroy(true));
        this.textures.clear();
    }
}
