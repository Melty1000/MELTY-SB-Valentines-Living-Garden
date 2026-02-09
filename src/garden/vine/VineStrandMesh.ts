import { Container, Mesh, MeshGeometry, Texture } from 'pixi.js';
import { StrandPoint } from './VineTypes';
import { VineColors } from '../../utils/colors';
import { config } from '../../config';

/**
 * Renders a vine strand using SimpleMesh for GPU-efficient vertex updates.
 * Creates 3 mesh layers: outline (dark), main (green), highlight (light).
 * Supports per-vertex width for tapering effect.
 */
export class VineStrandMesh {
    private outlineMesh: Mesh<MeshGeometry> | null = null;
    private mainMesh: Mesh<MeshGeometry> | null = null;
    private highlightMesh: Mesh<MeshGeometry> | null = null;

    private container: Container;
    private pointCount: number = 0;
    private baseThickness: number;

    // Pre-allocated arrays for geometry updates
    private positions: Float32Array = new Float32Array(0);
    private uvs: Float32Array = new Float32Array(0);
    private indices: Uint32Array = new Uint32Array(0);

    constructor(container: Container) {
        this.container = container;
        this.baseThickness = config.vine.thickness || 5;
    }

    /**
     * Initializes or rebuilds mesh geometry for the given point count.
     */
    public initialize(pointCount: number): void {
        if (this.pointCount === pointCount && this.outlineMesh) {
            return; // Already initialized with same count
        }

        this.destroy();
        this.pointCount = pointCount;

        if (pointCount < 2) return;

        // Each point creates 2 vertices (left/right of center line)
        // For N points: 2N vertices, (N-1)*2 triangles, (N-1)*6 indices
        const vertexCount = pointCount * 2;
        const triangleCount = (pointCount - 1) * 2;

        this.positions = new Float32Array(vertexCount * 2); // x,y pairs
        this.uvs = new Float32Array(vertexCount * 2);
        this.indices = new Uint32Array(triangleCount * 3);

        // Build indices (triangle strip pattern)
        let idx = 0;
        for (let i = 0; i < pointCount - 1; i++) {
            const tl = i * 2;     // top-left
            const tr = i * 2 + 1; // top-right
            const bl = (i + 1) * 2;     // bottom-left
            const br = (i + 1) * 2 + 1; // bottom-right

            // First triangle
            this.indices[idx++] = tl;
            this.indices[idx++] = tr;
            this.indices[idx++] = bl;

            // Second triangle
            this.indices[idx++] = tr;
            this.indices[idx++] = br;
            this.indices[idx++] = bl;
        }

        // Build UVs (constant along strand)
        for (let i = 0; i < pointCount; i++) {
            const t = i / (pointCount - 1);
            this.uvs[i * 4] = t;     // left vertex u
            this.uvs[i * 4 + 1] = 0; // left vertex v
            this.uvs[i * 4 + 2] = t; // right vertex u
            this.uvs[i * 4 + 3] = 1; // right vertex v
        }

        // Create meshes with different colors
        this.outlineMesh = this.createMesh(VineColors.dark, 1.0);
        this.mainMesh = this.createMesh(VineColors.main, 1.0);
        this.highlightMesh = this.createMesh(VineColors.light, 0.35);

        // Add in z-order (outline first, highlight last)
        this.container.addChild(this.outlineMesh);
        this.container.addChild(this.mainMesh);
        this.container.addChild(this.highlightMesh);
    }

    private createMesh(color: number, alpha: number): Mesh<MeshGeometry> {
        const geometry = new MeshGeometry({
            positions: new Float32Array(this.positions),
            uvs: new Float32Array(this.uvs),
            indices: new Uint32Array(this.indices),
        });

        // Create 1x1 white texture for solid color rendering
        const mesh = new Mesh({
            geometry,
            texture: Texture.WHITE,
        });

        mesh.tint = color;
        mesh.alpha = alpha;

        return mesh;
    }

    /**
     * Updates mesh vertex positions from strand points.
     * Called every frame to animate sway.
     * Handles culled points (t === -1) by collapsing their vertices.
     */
    public updatePositions(points: StrandPoint[], growth: number): void {
        if (points.length < 2 || !this.outlineMesh) return;

        // Ensure we're working with the correct point count
        if (points.length !== this.pointCount) {
            this.initialize(points.length);
        }

        // PRE-SCAN: Find first and last valid points for fallback positions
        let firstValidX = 0, firstValidY = 0;
        let lastValidX = 0, lastValidY = 0;
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            if (pt && pt.t !== -1) {
                firstValidX = pt.x;
                firstValidY = pt.y;
                break;
            }
        }
        lastValidX = firstValidX;
        lastValidY = firstValidY;

        // Recalculate positions with tapering
        for (let i = 0; i < points.length; i++) {
            const pt = points[i];
            const baseIdx = i * 4;  // 4 floats per point: leftX, leftY, rightX, rightY

            // Handle culled/invalid points by collapsing to nearest valid position
            if (!pt || pt.t === -1) {
                this.positions[baseIdx] = lastValidX;
                this.positions[baseIdx + 1] = lastValidY;
                this.positions[baseIdx + 2] = lastValidX;
                this.positions[baseIdx + 3] = lastValidY;
                continue;
            }

            const t = pt.t;

            const halfThickness = this.baseThickness * 0.5;
            let taperFactor = 1.0;

            // Fading Taper Logic:
            // At growth=1.0: Full taper strength (standard shape)
            // At growth=3.2: Zero taper strength (rectangular profile / full thickness)
            // 3.2 corresponds to ~196 flowers
            const maxTaperGrowth = 3.2;
            const taperStrength = Math.max(0, Math.min(1, (maxTaperGrowth - growth) / (maxTaperGrowth - 1.0)));

            let distFromCenter = Math.abs(t - 0.5);
            const effectiveGrowth = Math.max(0.01, growth);

            // Calculate raw taper based on current growth
            const normalizedDist = (distFromCenter * 2.0) / effectiveGrowth;
            const rawTaper = Math.pow(Math.max(0, 1.0 - normalizedDist), 1.2);

            // Mix raw taper with 1.0 (full thickness) based on taperStrength
            // Strength 1.0 = Use Raw Taper. Strength 0.0 = Use 1.0.
            taperFactor = rawTaper + (1.0 - rawTaper) * (1.0 - taperStrength);

            const thickness = Math.max(0.3, halfThickness * taperFactor);

            // Get normal direction (perpendicular to path)
            const prevIdx = Math.max(i - 1, 0);
            const nextIdx = Math.min(i + 1, points.length - 1);
            const prev = points[prevIdx];
            const next = points[nextIdx];

            // Use valid points for direction calculation
            const px = (prev && prev.t !== -1) ? prev.x : pt.x;
            const py = (prev && prev.t !== -1) ? prev.y : pt.y;
            const nx = (next && next.t !== -1) ? next.x : pt.x;
            const ny = (next && next.t !== -1) ? next.y : pt.y;

            const dx = nx - px;
            const dy = ny - py;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const normalX = -dy / len;
            const normalY = dx / len;

            // Left and right vertices
            this.positions[baseIdx] = pt.x + normalX * thickness;
            this.positions[baseIdx + 1] = pt.y + normalY * thickness;
            this.positions[baseIdx + 2] = pt.x - normalX * thickness;
            this.positions[baseIdx + 3] = pt.y - normalY * thickness;

            lastValidX = pt.x;
            lastValidY = pt.y;
        }

        // Update all three meshes with different widths
        this.updateMeshGeometry(this.outlineMesh!, 1.25);  // Outline slightly wider
        this.updateMeshGeometry(this.mainMesh!, 1.0);
        this.updateMeshGeometry(this.highlightMesh!, 0.4);
    }

    private updateMeshGeometry(mesh: Mesh<MeshGeometry>, widthScale: number): void {
        const geom = mesh.geometry;
        const posAttr = geom.getAttribute('aPosition');

        if (widthScale === 1.0) {
            // Just copy positions directly
            posAttr.buffer.data.set(this.positions);
        } else {
            // Scale width from center
            const scaled = new Float32Array(this.positions.length);
            for (let i = 0; i < this.pointCount; i++) {
                const baseIdx = i * 4;
                const cx = (this.positions[baseIdx] + this.positions[baseIdx + 2]) / 2;
                const cy = (this.positions[baseIdx + 1] + this.positions[baseIdx + 3]) / 2;

                scaled[baseIdx] = cx + (this.positions[baseIdx] - cx) * widthScale;
                scaled[baseIdx + 1] = cy + (this.positions[baseIdx + 1] - cy) * widthScale;
                scaled[baseIdx + 2] = cx + (this.positions[baseIdx + 2] - cx) * widthScale;
                scaled[baseIdx + 3] = cy + (this.positions[baseIdx + 3] - cy) * widthScale;
            }
            posAttr.buffer.data.set(scaled);
        }

        posAttr.buffer.update();
    }

    public setVisible(visible: boolean): void {
        if (this.outlineMesh) this.outlineMesh.visible = visible;
        if (this.mainMesh) this.mainMesh.visible = visible;
        if (this.highlightMesh) this.highlightMesh.visible = visible;
    }

    public destroy(): void {
        if (this.outlineMesh) {
            this.outlineMesh.destroy();
            this.outlineMesh = null;
        }
        if (this.mainMesh) {
            this.mainMesh.destroy();
            this.mainMesh = null;
        }
        if (this.highlightMesh) {
            this.highlightMesh.destroy();
            this.highlightMesh = null;
        }
        this.pointCount = 0;
    }
}
