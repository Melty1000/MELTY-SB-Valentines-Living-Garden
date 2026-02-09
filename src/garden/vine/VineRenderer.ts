import { Graphics, Container, Sprite, type Renderer } from 'pixi.js';
import {
    StrandPoint,
    ThornData,
    LeafData,
    TwigData,
    VinePoint
} from './VineTypes';
import { VineColors } from '../../utils/colors';
import { FoliageCache, FoliageType } from './FoliageCache';
import { TendrilCache } from './TendrilCache';
import { VineStrandMesh } from './VineStrandMesh';

export interface RenderState {
    strands: StrandPoint[][];
    leaves: LeafData[];
    twigs: TwigData[];
    thorns: ThornData[];
    vinePoints: VinePoint[];
    growth: number;
}

/**
 * High-Performance Vine Renderer using SimpleMesh.
 * 
 * Performance improvements over original Graphics-based approach:
 * - No per-frame graphics.clear() — uses mesh vertex updates
 * - Tendrils baked to textures — drawn once, displayed as sprites
 * - Per-vertex width for tapering — no segmented stroke calls
 */
export class VineRenderer {
    // Mesh-based strand rendering (replaces Graphics)
    private backStrandMesh: VineStrandMesh;
    private frontStrandMesh: VineStrandMesh;

    // Containers for z-ordering
    private backContainer: Container;
    private frontContainer: Container;
    private leafContainer: Container;
    private frontLeafContainer: Container;
    private thornContainer: Container;
    private frontThornContainer: Container;
    private twigContainer: Container;
    private frontTwigContainer: Container;

    // Sprite pools
    private leafSprites: Sprite[] = [];
    private thornSprites: Sprite[] = [];
    private twigSprites: Sprite[] = [];

    private isBackground: boolean;
    private renderer: Renderer | null = null;
    private lastTotalLength: number = -1;
    private initialized: boolean = false;

    constructor(graphics: Graphics, isBackground: boolean) {
        this.isBackground = isBackground;

        // Create containers
        this.backContainer = new Container();
        this.frontContainer = new Container();
        this.leafContainer = new Container();
        this.frontLeafContainer = new Container();
        this.thornContainer = new Container();
        this.frontThornContainer = new Container();
        this.twigContainer = new Container();
        this.frontTwigContainer = new Container();

        // Create mesh renderers
        this.backStrandMesh = new VineStrandMesh(this.backContainer);
        this.frontStrandMesh = new VineStrandMesh(this.frontContainer);

        // Add to parent in z-order (if parent available)
        if (graphics.parent) {
            this.setupContainerHierarchy(graphics);
        }

        // Hide original graphics (keep for compatibility)
        graphics.visible = false;
    }

    private setupContainerHierarchy(graphics: Graphics): void {
        const parent = graphics.parent!;
        const idx = parent.getChildIndex(graphics);

        // Z-order: back → backTwigs → backLeaves → backThorns → front → frontTwigs → frontLeaves → frontThorns
        parent.addChildAt(this.backContainer, idx + 1);
        parent.addChildAt(this.twigContainer, idx + 2);
        parent.addChildAt(this.leafContainer, idx + 3);
        parent.addChildAt(this.thornContainer, idx + 4);
        parent.addChildAt(this.frontContainer, idx + 5);
        parent.addChildAt(this.frontTwigContainer, idx + 6);
        parent.addChildAt(this.frontLeafContainer, idx + 7);
        parent.addChildAt(this.frontThornContainer, idx + 8);
    }

    public setRenderer(renderer: Renderer): void {
        this.renderer = renderer;
    }

    public render(state: RenderState): void {
        const totalLength = state.vinePoints[state.vinePoints.length - 1].len;
        this.lastTotalLength = totalLength;

        // Initialize meshes on first render (now we have point count)
        if (!this.initialized && state.strands[0].length > 0) {
            this.backStrandMesh.initialize(state.strands[0].length);
            this.frontStrandMesh.initialize(state.strands[0].length);
            this.initialized = true;
        }

        // 1. Update strand mesh positions (no clear needed!)
        this.updateStrandMeshes(state);

        // 2. Render foliage (leaves, thorns as sprites — already efficient)
        this.renderFoliage(state, totalLength);

        // 3. Render twigs as cached sprites (not procedural drawing)
        this.renderTwigs(state, totalLength);
    }


    private updateStrandMeshes(state: RenderState): void {
        this.backStrandMesh.updatePositions(state.strands[0], state.growth);
        this.frontStrandMesh.updatePositions(state.strands[1], state.growth);
    }

    private renderTwigs(state: RenderState, totalLength: number): void {
        if (!this.renderer) return;

        // Reset sprite visibility
        this.twigSprites.forEach(s => s.visible = false);
        let twigIdx = 0;

        for (const twig of state.twigs) {
            if (!this.isItemVisible(twig.t, state.growth)) continue;

            const anchor = this.getFoliageAnchor(state, twig.strandIdx, twig.t, twig.angleOffset, totalLength);
            if (!anchor.p) continue;

            // Get or create sprite
            if (!this.twigSprites[twigIdx]) {
                const sprite = new Sprite();
                sprite.anchor.set(0, 0.5); // Anchor at base, center vertically
                this.twigSprites.push(sprite);
            }

            const sprite = this.twigSprites[twigIdx++];
            const parent = anchor.isFront ? this.frontTwigContainer : this.twigContainer;
            parent.addChild(sprite);

            sprite.visible = true;
            sprite.texture = TendrilCache.getTexture(this.renderer, twig.length, twig.curls, twig.curlSign);
            sprite.position.set(anchor.p.x, anchor.p.y);
            sprite.rotation = anchor.angle;
        }
    }

    private renderFoliage(state: RenderState, totalLength: number): void {
        this.leafSprites.forEach(s => s.visible = false);
        this.thornSprites.forEach(s => s.visible = false);
        let leafIdx = 0;
        let thornIdx = 0;

        const skipColor = this.isBackground ? 0x1e3a1e : VineColors.leaf;
        const leafAlpha = this.isBackground ? 0.4 : 1.0;

        // Leaves (Sprites)
        if (this.renderer) {
            for (const leaf of state.leaves) {
                if (!this.isItemVisible(leaf.t, state.growth)) continue;
                const { p, angle, isFront, size } = this.getFoliageAnchor(state, leaf.strandIdx, leaf.t, leaf.angleOffset, totalLength, leaf.size);
                if (!p) continue;

                const parent = isFront ? this.frontLeafContainer : this.leafContainer;
                if (!this.leafSprites[leafIdx]) {
                    const s = new Sprite();
                    s.anchor.set(0.5);
                    this.leafSprites.push(s);
                }
                const sprite = this.leafSprites[leafIdx++];
                parent.addChild(sprite);
                sprite.visible = true;
                sprite.texture = FoliageCache.getTexture(this.renderer, FoliageType.Leaf, size, 0, skipColor);
                sprite.position.set(p.x, p.y);
                sprite.rotation = angle;
                sprite.alpha = leafAlpha;
            }
        }

        // Thorns (Sprites)
        if (this.renderer) {
            for (const th of state.thorns) {
                if (!this.isItemVisible(th.t, state.growth)) continue;
                const { p, angle, isFront, size } = this.getFoliageAnchor(state, th.strandIdx, th.t, th.angleOffset, totalLength, th.size);
                if (!p) continue;

                const parent = isFront ? this.frontThornContainer : this.thornContainer;
                if (!this.thornSprites[thornIdx]) {
                    const s = new Sprite();
                    s.anchor.set(0.5);
                    this.thornSprites.push(s);
                }
                const sprite = this.thornSprites[thornIdx++];
                parent.addChild(sprite);
                sprite.visible = true;
                sprite.texture = FoliageCache.getTexture(this.renderer, FoliageType.Thorn, size, 0, VineColors.main);
                sprite.position.set(p.x, p.y);
                sprite.rotation = angle;
            }
        }
    }

    private isItemVisible(t: number, growth: number): boolean {
        let distFromCenter = Math.abs(t - 0.5);
        if (distFromCenter > 0.5) distFromCenter = 1.0 - distFromCenter;
        return distFromCenter <= growth * 0.5;
    }

    private getFoliageAnchor(state: RenderState, strandIdx: number, t: number, angleOffset: number, _totalLength: number, baseSize?: number): { p: any, angle: number, isFront: boolean, size: number } {
        const idx = Math.floor(t * (state.vinePoints.length - 1));
        const p = state.strands[strandIdx][idx];
        if (!p || p.t === -1) return { p: null, angle: 0, isFront: false, size: 0 };

        const next = state.vinePoints[Math.min(idx + 1, state.vinePoints.length - 1)];
        const curr = state.vinePoints[idx];
        const pathAngle = Math.atan2(next.y - curr.y, next.x - curr.x);
        const angle = pathAngle + angleOffset;

        const ph = strandIdx * Math.PI;
        const zVal = Math.cos(this.getHelixAngle(curr.len, ph, curr.warp));
        const isFront = zVal >= 0;

        let size = 0;
        if (baseSize !== undefined) {
            // At full growth, foliage is full size - no tapering
            if (state.growth >= 0.99) {
                size = baseSize;
            } else {
                let distFromCenter = Math.abs(t - 0.5);
                if (distFromCenter > 0.5) distFromCenter = 1.0 - distFromCenter;
                const normalizedDist = (distFromCenter * 2.0) / (state.growth || 0.01);
                const taperFactor = Math.pow(Math.max(0, 1.0 - normalizedDist), 1.2);
                size = baseSize * taperFactor;
            }
        }

        return { p, angle, isFront, size };
    }

    private getHelixAngle(len: number, phaseOffset: number, warp: number): number {
        const relativeLen = len - (this.lastTotalLength * 0.5);
        const pixelsPerCycle = 150;
        const freq = (Math.PI * 2) / pixelsPerCycle;
        return relativeLen * freq + phaseOffset + warp;
    }

    public destroy(): void {
        this.backStrandMesh.destroy();
        this.frontStrandMesh.destroy();

        this.leafSprites.forEach(s => s.destroy());
        this.thornSprites.forEach(s => s.destroy());
        this.twigSprites.forEach(s => s.destroy());

        this.backContainer.destroy();
        this.frontContainer.destroy();
        this.leafContainer.destroy();
        this.frontLeafContainer.destroy();
        this.thornContainer.destroy();
        this.frontThornContainer.destroy();
        this.twigContainer.destroy();
        this.frontTwigContainer.destroy();

        TendrilCache.clear();
    }
}
