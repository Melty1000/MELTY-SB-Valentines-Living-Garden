import { Graphics, Texture, Renderer } from 'pixi.js';
import { drawSeed, drawBud, drawRose } from '../../utils/procedural';

export enum CacheType {
    Seed = 'seed',
    Bud = 'bud',
    Rose = 'rose',
    Glow = 'glow'
}

export class FlowerCache {
    private static textures: Map<string, Texture> = new Map();
    private static tempGraphics: Graphics = new Graphics();

    /**
     * Generates or retrieves a cached texture for a flower stage.
     */
    public static getTexture(
        renderer: Renderer,
        type: CacheType,
        size: number,
        color: number,
        openness: number = 1
    ): Texture {
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
                this.tempGraphics.fill({ color: color, alpha: 0.15 });
                break;
        }

        // Create texture
        // Add padding to prevent clipping
        // REFINED: Increased resolution to 2x for sharp rendering on all displays
        const tex = renderer.generateTexture({
            target: this.tempGraphics,
            resolution: 2, // Was 1, caused blurriness
            antialias: true,
        });

        this.textures.set(key, tex);
        return tex;
    }

    public static clear(): void {
        this.textures.forEach(t => t.destroy(true));
        this.textures.clear();
    }
}
