import { Container, Graphics } from 'pixi.js';
import { CrownFlower } from './flowers/CrownFlower';
import { noise, lerp } from '../utils/math';
import { config } from '../config';
import {
  StrandPoint,
  AttachmentPoint
} from './vine/VineTypes';
import { VineSimulator } from './vine/VineSimulator';
import { VineRenderer } from './vine/VineRenderer';

export class Vine extends Container {
  private simulator: VineSimulator;
  private renderer: VineRenderer;
  private crownFlower: CrownFlower;
  private graphics: Graphics;
  private isBackground: boolean;
  private growth: number = config.vine.defaultGrowth || 0.03;
  private growthTarget: number = config.vine.defaultGrowth || 0.03;
  private timeOffset: number;
  // Apex Predator Optimization (v6): Memory Pooling
  // allocate once, reuse forever.
  private strandPool: StrandPoint[][] = [[], []];
  private lastCalculatedStrands: StrandPoint[][] = [[], []];

  constructor(width: number, height: number, isBackground: boolean = false) {
    super();
    this.isBackground = isBackground;
    this.timeOffset = Math.random() * 1000;
    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.simulator = new VineSimulator(width, height, isBackground);
    this.renderer = new VineRenderer(this.graphics, isBackground);

    this.crownFlower = new CrownFlower('rose', 14);
    if (!this.isBackground) {
      this.addChild(this.crownFlower);
    }

    this.refresh();
  }

  public refresh(): void {
    this.simulator.generateVinePath();
    this.simulator.generateThorns();
    this.simulator.generateFoliage();
    this.simulator.attachmentPoints = [];
    const steps = config.vine.attachmentSteps || 40;
    const exclusion = config.vine.crownExclusionZone || 0.02;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      if (Math.abs(t - 0.5) < exclusion) continue; // Exclude top crown area

      this.simulator.attachmentPoints.push({ t, strandIdx: 0, occupied: false, slotIdx: i % 2 });
      this.simulator.attachmentPoints.push({ t, strandIdx: 1, occupied: false, slotIdx: (i + 1) % 2 });
    }
    // Shuffle candidates but keep slotIdx intact for logic
    this.simulator.attachmentPoints.sort(() => Math.random() - 0.5);

    // Initialize Pool
    this.ensurePoolSize(this.simulator.vinePoints.length);

    this.draw(0);
  }

  private ensurePoolSize(size: number): void {
    for (let s = 0; s < 2; s++) {
      while (this.strandPool[s].length < size) {
        this.strandPool[s].push({ x: 0, y: 0, t: 0 });
      }
    }
  }

  public update(time: number, _deltaTime: number, windOffset: number = 0): void {
    const strands = this.draw(time, windOffset);

    if (!this.isBackground && strands[0].length > 0) {
      const crown = this.getCrownPosition(time, windOffset);
      this.crownFlower.position.set(crown.x, crown.y);
      this.crownFlower.update(time, _deltaTime, windOffset);
    }

    // Smooth growth lerping
    if (Math.abs(this.growth - this.growthTarget) > 0.001) {
      this.growth = lerp(this.growth, this.growthTarget, 0.05);
    } else {
      this.growth = this.growthTarget;
    }
  }

  private draw(time: number, windOffset: number = 0): StrandPoint[][] {
    const strands = this.calculateStrands(time, windOffset);

    this.renderer.render({
      strands,
      leaves: this.simulator.leaves,
      twigs: this.simulator.twigs,
      thorns: this.simulator.thorns,
      vinePoints: this.simulator.vinePoints,
      growth: this.growth
    });

    this.lastCalculatedStrands = strands;
    return strands;
  }

  private calculateStrands(time: number, windOffset: number): StrandPoint[][] {
    // We return the pool directly. Consumers must NOT store references to the arrays,
    // or they must copy them if they need persistence (which they don't).
    const pts = this.simulator.vinePoints;
    const amplitude = config.vine.helixAmplitude || 12;  // Independent strand separation

    // Reuse these to avoid allocation inside the loop? 
    // Actually map() creates new objects. Let's optimize normals too?
    // Normals depend on geometry which is static until resize.
    // They should be cached in VineSimulator, but for now let's just focus on strands.

    // Quick normal calc without allocation (inline) to avoid the .map() overhead
    // Or just accept the 1200 normal objects for now (they are small).
    // Let's stick to the big wins first.

    // Normals are now pre-calculated in VineSimulator (p.nx, p.ny)
    // No allocation needed here!

    for (let s = 0; s < 2; s++) {
      const phaseOffset = s * Math.PI;
      const pool = this.strandPool[s];

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const t = i / (pts.length - 1);

        // Apex Predator: Write directly to pool
        const pt = pool[i];

        let distFromCenter = Math.abs(t - 0.5);
        if (distFromCenter > 0.5) distFromCenter = 1.0 - distFromCenter;

        // Culling: If too thin, we effectively "null" it logic-wise, 
        // but for pooling we just set it to NaN or rely on the checked length?
        // The original logic pushed "null".
        // To keep pooling simple, we'll mark t as -1 to indicate invalid/culled.
        if (distFromCenter > this.growth * 0.5) {
          pt.t = -1; // Marker for "hidden"
          continue;
        }

        // TAPER: Support Center-Out Growth (Top -> Bottom)
        // Ensure strands connect at the "Growing Tips" (current growth edge)
        // AND at the "Roots" (final destination)
        const visibleLimit = this.growth * 0.5;
        const distToEdge = visibleLimit - distFromCenter;
        // Convert T-space to approx pixels for consistent 100px taper
        const pxToEdge = distToEdge * this.simulator.totalLength;
        const growthTaper = Math.max(0, Math.min(1, pxToEdge / 100));

        // FORCED TIP CONNECTION: Ensure strands meet at t=0 and t=1 regardless of growth
        // Taper over the first/last 5% of length
        const endTaper = Math.min(1, Math.min(t, 1.0 - t) * 20);

        // Combine growth taper (animation) with end taper (geometry)
        const taper = growthTaper * endTaper;

        // TIME-ANIMATED helix
        // time is in SECONDS.
        const helixTimeSpeed = 0.05; // Very slow helix rotation (~120s cycle)
        // Remove 'p.warp' for clean sine wave
        const animatedHelixAngle = this.simulator.getHelixAngle(p.len, phaseOffset, 0) + time * helixTimeSpeed;

        const helixOffset = Math.sin(animatedHelixAngle) * (amplitude * taper);

        // SYNCHRONIZED OPPOSITE MOTION
        // time is in SECONDS
        const swayFreq = 0.1;  // ~0.1 rad/s = ~60 second cycle (extremely gentle)
        const timeAngle = time * swayFreq + p.len * 0.05;
        const swayAmt = 4 * taper;     // Apply taper to sway too

        // THE KEY: s=0 uses +sin, s=1 uses -sin (OPPOSITE direction)
        const directionMultiplier = s === 0 ? 1 : -1;
        const timeSwayX = Math.sin(timeAngle) * swayAmt * directionMultiplier;
        const timeSwayY = Math.cos(timeAngle * 1.3) * (swayAmt * 0.4) * directionMultiplier;

        // Use pre-calculated normal
        const nx = p.nx;
        const ny = p.ny;

        // Wind only (global sway disabled)
        const windX = windOffset * 0.3;

        // Apply: base position + wind + OPPOSITE sway + helix
        pt.x = p.x + windX + timeSwayX + nx * helixOffset;
        pt.y = p.y + timeSwayY + ny * helixOffset;
        pt.t = t;
      }
    }



    return this.strandPool;
  }

  public getCrownPosition(time: number, windOffset: number = 0): { x: number; y: number } {
    const p = this.simulator.getPointAtT(0.5);
    const speed = config.vine.swaySpeed || 0.0015;
    // Fix: Use ?? to allow 0 (disabled)
    const amt = config.vine.swayAmount ?? 25;
    const swayX = noise(time * speed + this.timeOffset + p.len * 0.005, 1000.3) * amt + windOffset * 0.3;
    const swayY = noise(time * (speed * 0.8) + this.timeOffset + p.len * 0.005, 1000.3) * (amt * 0.4);
    return { x: p.x + swayX, y: p.y + swayY };
  }

  public getStrandPosition(t: number, strandIdx: number, time: number, windOffset: number = 0): StrandPoint | null {
    const pts = this.simulator.vinePoints;
    if (isNaN(t)) return null;

    const idx = Math.floor(t * (pts.length - 1));
    if (isNaN(idx) || idx < 0 || idx >= pts.length) return null;

    // Apex Predator Optimization (v4):
    // Use the last calculated strands if available to avoid redundant noise/helix math.
    // v6: Check for pooled "t=-1" marker which means culled/null.
    if (this.lastCalculatedStrands[strandIdx] && this.lastCalculatedStrands[strandIdx][idx]) {
      const fastPt = this.lastCalculatedStrands[strandIdx][idx];
      // Only return early if the point is actually valid in the pool.
      // If t is -1, it's 'culled' in the pool (likely stale from last frame's growth).
      // Fall through to recalculate manually for the current frame's growth.
      if (fastPt.t !== -1) return fastPt;
    }

    const p = pts[idx];
    const amplitude = config.vine.helixAmplitude ?? 12; // Fix: Allow 0

    // Reuse pre-calculated normal
    const n = { dx: p.nx, dy: p.ny };

    // TIME-ANIMATED helix (match calculateStrands)
    // Reuse distFromCenter calculation for consistency
    let distFromCenter = Math.abs(t - 0.5);
    if (distFromCenter > 0.5) distFromCenter = 1.0 - distFromCenter;

    // TAPER: Support Center-Out Growth (Top -> Bottom)
    // Ensure strands connect at the "Growing Tips" (current growth edge)
    // AND at the "Roots" (final destination)
    const visibleLimit = this.growth * 0.5;
    const distToEdge = visibleLimit - distFromCenter;
    // Convert T-space to approx pixels for consistent 100px taper
    const pxToEdge = distToEdge * this.simulator.totalLength;
    const taper = Math.max(0, Math.min(1, pxToEdge / 100));

    // TIME-ANIMATED helix
    // time is in SECONDS.
    const phaseOffset = strandIdx * Math.PI;
    const helixTimeSpeed = 0.05; // Very slow helix rotation (~120s cycle)
    // Remove 'p.warp' for clean sine wave
    const animatedHelixAngle = this.simulator.getHelixAngle(p.len, phaseOffset, 0) + time * helixTimeSpeed;

    const helixOffset = Math.sin(animatedHelixAngle) * (amplitude * taper);

    // SYNCHRONIZED OPPOSITE MOTION
    // time is in SECONDS
    const swayFreq = 0.1;  // ~0.1 rad/s = ~60 second cycle (extremely gentle)
    const timeAngle = time * swayFreq + p.len * 0.05;
    // Fix: Use config.vine.swayAmount instead of hardcoded 4, allow 0
    const swayAmt = (config.vine.swayAmount ?? 0) * taper;

    // THE KEY: s=0 uses +sin, s=1 uses -sin (OPPOSITE direction)
    const directionMultiplier = strandIdx === 0 ? 1 : -1;
    const timeSwayX = Math.sin(timeAngle) * swayAmt * directionMultiplier;
    const timeSwayY = Math.cos(timeAngle * 1.3) * (swayAmt * 0.4) * directionMultiplier;

    const windX = windOffset * 0.3;

    return {
      x: p.x + windX + timeSwayX + n.dx * helixOffset,
      y: p.y + timeSwayY + n.dy * helixOffset,
      t: t
    };
  }

  public getAttachmentPoints(): AttachmentPoint[] {
    return this.simulator.attachmentPoints;
  }

  public getAvailableAttachmentPoint(externalOccupied: AttachmentPoint[] = [], preferredSlotType: number = 0): AttachmentPoint | null {
    const baseSpacing = config.vine.minSpacing || 0.05;
    const count = externalOccupied.length;

    const compressionThreshold = 100; // Allow more before spacing compacts
    const spacingReduction = count > compressionThreshold ? (count - compressionThreshold) * 0.0001 : 0;
    const currentMinSpacing = Math.max(0.005, baseSpacing - spacingReduction);

    const candidates = this.simulator.attachmentPoints
      .filter(p => !p.occupied)
      .filter(p => {
        const distFromCenter = Math.abs(p.t - 0.5);
        // Deep Fix: Use growthTarget instead of current growth 
        // This allows bulk-spawning into the expansion zone while the vine is still animating.
        return distFromCenter <= this.growthTarget * 0.5;
      });

    if (candidates.length === 0) return null;

    // Filter by type-preference (Heart vs Flower slots)
    // preferredSlotType: 0 for Flower, 1 for Heart
    const typeMatchingCandidates = candidates.filter(p => p.slotIdx % 2 === preferredSlotType);

    // Fallback to ANY candidate if preferred slot type is full
    const activeCandidates = typeMatchingCandidates.length > 0 ? typeMatchingCandidates : candidates;

    const available = activeCandidates.filter(p => {
      return !externalOccupied.some(eo =>
        eo.strandIdx === p.strandIdx && Math.abs(p.t - eo.t) < currentMinSpacing
      );
    });

    if (available.length > 0) {
      // Uniform Random: Pick any valid spot to ensure a natural "popcorn" spread
      // instead of clumping at the crown or endpoints.
      const randomIndex = Math.floor(Math.random() * available.length);
      return available[randomIndex];
    }
    return null;
  }

  public resetAttachmentPoints(): void {
    this.simulator.attachmentPoints.forEach(p => p.occupied = false);
    console.log('[Vine] All attachment points reset');
  }

  public setGrowth(value: number): void {
    this.growthTarget = Math.max(0, Math.min(config.vine.maxGrowth, value));
  }

  public setRenderer(renderer: any): void {
    this.renderer.setRenderer(renderer);
  }

  public getGrowth(): number {
    return this.growth;
  }

  public getCrownFlower(): any {
    return this.crownFlower;
  }

  public setCrownColor(color: number): void {
    this.crownFlower.setColor(color);
  }

  public getCrownColor(): number {
    return this.crownFlower.getColor();
  }

  public resize(w: number, h: number): void {
    this.simulator = new VineSimulator(w, h, this.isBackground);
    this.refresh();
  }

  public destroy(): void {
    this.crownFlower.destroy();
    this.graphics.destroy();
    super.destroy();
  }
}
