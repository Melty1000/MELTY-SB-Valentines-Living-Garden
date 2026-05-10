import { Container, Graphics } from 'pixi.js';
import { VineBranch } from './VineBranch';
import { CrownFlower } from './CrownFlower';
import { noise } from '../utils/math';
import { VineColors } from '../utils/colors';
import { drawLeaf, drawTendril } from '../utils/procedural';
import { config } from '../config';

interface VinePoint {
  x: number;
  y: number;
  thickness: number;
}

interface VineLeaf {
  t: number;  // Position along vine (0-1)
  side: number;  // 1 or -1
  angle: number;
  size: number;
  offset: number;  // For animation
}

interface VineTendril {
  t: number;
  side: number;
  angle: number;
  length: number;
  curls: number;
}

export class Vine extends Container {
  private graphics: Graphics;
  private branches: VineBranch[] = [];
  private crownFlower: CrownFlower;
  private width_: number;
  private height_: number;
  private timeOffset: number;

  // Store vine path points for branch attachment
  private vinePoints: VinePoint[] = [];
  private leaves: VineLeaf[] = [];
  private tendrils: VineTendril[] = [];

  constructor(width: number, height: number) {
    super();
    this.width_ = width;
    this.height_ = height;
    this.timeOffset = Math.random() * 1000;

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    this.crownFlower = new CrownFlower('rose', 35);
    this.addChild(this.crownFlower);

    this.generateVinePath();
    this.generateLeaves();
    this.generateTendrils();
    this.generateBranches();
    this.draw(0);
  }

  private generateVinePath(): void {
    this.vinePoints = [];

    const margin = 0.03;
    const topY = this.height_ * 0.06;
    const bottomY = this.height_ * 0.97;
    const leftX = this.width_ * margin;
    const rightX = this.width_ * (1 - margin);

    // Create smooth path: bottom-left -> up -> across top -> down -> bottom-right
    const segments = 60;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let x: number, y: number, thickness: number;

      if (t < 0.35) {
        // Left side going up
        const localT = t / 0.35;
        x = leftX;
        y = bottomY - (bottomY - topY - this.height_ * 0.08) * localT;
        thickness = config.vine.thickness * (1 - localT * 0.15);
      } else if (t < 0.65) {
        // Across the top (arch)
        const localT = (t - 0.35) / 0.3;
        const archHeight = this.height_ * 0.02;

        // Smooth curve across top
        x = leftX + (rightX - leftX) * localT;
        // Parabolic arch
        const archT = localT * 2 - 1; // -1 to 1
        y = topY + archHeight * (1 - archT * archT);
        thickness = config.vine.thickness * 0.85;
      } else {
        // Right side going down
        const localT = (t - 0.65) / 0.35;
        x = rightX;
        y = topY + this.height_ * 0.08 + (bottomY - topY - this.height_ * 0.08) * localT;
        thickness = config.vine.thickness * (0.85 + localT * 0.15);
      }

      this.vinePoints.push({ x, y, thickness });
    }
  }

  private generateLeaves(): void {
    this.leaves = [];
    const leafCount = config.vine.leafCount;

    for (let i = 0; i < leafCount; i++) {
      const t = 0.05 + Math.random() * 0.9;
      const side = Math.random() > 0.5 ? 1 : -1;

      // Determine angle based on position on vine
      let baseAngle: number;
      if (t < 0.35) {
        // Left side - leaves point right/outward
        baseAngle = side > 0 ? Math.PI * 0.1 : -Math.PI * 0.9;
      } else if (t < 0.65) {
        // Top - leaves point down
        baseAngle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.4;
      } else {
        // Right side - leaves point left/outward
        baseAngle = side > 0 ? Math.PI * 0.9 : Math.PI * 0.1;
      }

      this.leaves.push({
        t,
        side,
        angle: baseAngle + (Math.random() - 0.5) * 0.3,
        size: config.vine.leafSize * (0.6 + Math.random() * 0.4),
        offset: Math.random() * 1000,
      });
    }
  }

  private generateTendrils(): void {
    this.tendrils = [];
    const tendrilCount = config.vine.tendrilCount;

    for (let i = 0; i < tendrilCount; i++) {
      const t = 0.1 + Math.random() * 0.8;
      const side = Math.random() > 0.5 ? 1 : -1;

      let baseAngle: number;
      if (t < 0.35) {
        baseAngle = side > 0 ? Math.PI * 0.2 : -Math.PI * 0.8;
      } else if (t < 0.65) {
        baseAngle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.6;
      } else {
        baseAngle = side > 0 ? Math.PI * 0.8 : Math.PI * 0.2;
      }

      this.tendrils.push({
        t,
        side,
        angle: baseAngle,
        length: 15 + Math.random() * 20,
        curls: 1.5 + Math.random() * 1.5,
      });
    }
  }

  private generateBranches(): void {
    for (const branch of this.branches) {
      this.removeChild(branch);
      branch.destroy();
    }
    this.branches = [];

    const branchesPerSide = config.vine.branchesPerSide;

    // Left side branches
    for (let i = 0; i < branchesPerSide; i++) {
      const t = 0.08 + (i / branchesPerSide) * 0.27; // 0.08 to 0.35
      const point = this.getPointAtT(t);

      const branch = new VineBranch(
        point.x,
        point.y,
        Math.PI * 0.15 + Math.random() * 0.2, // Point inward
        config.vine.branchLength * (0.7 + Math.random() * 0.3)
      );
      branch.x = point.x;
      branch.y = point.y;
      this.branches.push(branch);
      this.addChild(branch);
    }

    // Right side branches
    for (let i = 0; i < branchesPerSide; i++) {
      const t = 0.65 + (i / branchesPerSide) * 0.27; // 0.65 to 0.92
      const point = this.getPointAtT(t);

      const branch = new VineBranch(
        point.x,
        point.y,
        Math.PI * 0.85 - Math.random() * 0.2, // Point inward
        config.vine.branchLength * (0.7 + Math.random() * 0.3)
      );
      branch.x = point.x;
      branch.y = point.y;
      this.branches.push(branch);
      this.addChild(branch);
    }
  }

  private getPointAtT(t: number): VinePoint {
    const index = Math.floor(t * (this.vinePoints.length - 1));
    const nextIndex = Math.min(index + 1, this.vinePoints.length - 1);
    const localT = (t * (this.vinePoints.length - 1)) - index;

    const p1 = this.vinePoints[index];
    const p2 = this.vinePoints[nextIndex];

    return {
      x: p1.x + (p2.x - p1.x) * localT,
      y: p1.y + (p2.y - p1.y) * localT,
      thickness: p1.thickness + (p2.thickness - p1.thickness) * localT,
    };
  }

  resize(width: number, height: number): void {
    this.width_ = width;
    this.height_ = height;
    this.generateVinePath();
    this.generateLeaves();
    this.generateTendrils();
    this.generateBranches();
    this.draw(0);
  }

  getAvailableBranch(): VineBranch | null {
    const available = this.branches.filter((b) => !b.isOccupied());
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  getAllBranches(): VineBranch[] {
    return this.branches;
  }

  getCrownPosition(): { x: number; y: number } {
    return {
      x: this.width_ * 0.5,
      y: this.height_ * 0.06,
    };
  }

  update(time: number, windOffset: number = 0): void {
    this.draw(time, windOffset);

    for (const branch of this.branches) {
      branch.update(time, windOffset);
    }

    const crownPos = this.getCrownPosition();
    this.crownFlower.x = crownPos.x;
    this.crownFlower.y = crownPos.y;
    this.crownFlower.update(time, windOffset);
  }

  private draw(time: number, windOffset: number = 0): void {
    this.graphics.clear();

    if (this.vinePoints.length < 2) return;

    // Very subtle sway
    const globalSway = noise(time * config.vine.swaySpeed + this.timeOffset, 0) * config.vine.swayAmount;

    // Draw main vine with thickness
    this.drawMainVine(time, globalSway + windOffset * 0.3);

    // Draw leaves
    this.drawLeaves(time, globalSway + windOffset * 0.5);

    // Draw tendrils
    this.drawTendrils(time, globalSway + windOffset * 0.4);
  }

  private drawMainVine(_time: number, sway: number): void {
    // Draw shadow/dark layer first
    this.graphics.beginPath();
    for (let i = 0; i < this.vinePoints.length; i++) {
      const p = this.vinePoints[i];
      const localSway = sway * (0.5 + Math.sin(i * 0.1) * 0.5);

      if (i === 0) {
        this.graphics.moveTo(p.x + localSway + 2, p.y + 2);
      } else {
        this.graphics.lineTo(p.x + localSway + 2, p.y + 2);
      }
    }
    this.graphics.stroke({
      width: config.vine.thickness + 4,
      color: VineColors.dark,
      cap: 'round',
      join: 'round',
      alpha: 0.4,
    });

    // Draw main vine
    this.graphics.beginPath();
    for (let i = 0; i < this.vinePoints.length; i++) {
      const p = this.vinePoints[i];
      const localSway = sway * (0.5 + Math.sin(i * 0.1) * 0.5);

      if (i === 0) {
        this.graphics.moveTo(p.x + localSway, p.y);
      } else {
        this.graphics.lineTo(p.x + localSway, p.y);
      }
    }
    this.graphics.stroke({
      width: config.vine.thickness,
      color: VineColors.main,
      cap: 'round',
      join: 'round',
    });

    // Draw highlight
    this.graphics.beginPath();
    for (let i = 0; i < this.vinePoints.length; i++) {
      const p = this.vinePoints[i];
      const localSway = sway * (0.5 + Math.sin(i * 0.1) * 0.5);

      if (i === 0) {
        this.graphics.moveTo(p.x + localSway - 2, p.y - 1);
      } else {
        this.graphics.lineTo(p.x + localSway - 2, p.y - 1);
      }
    }
    this.graphics.stroke({
      width: config.vine.thickness * 0.3,
      color: VineColors.light,
      cap: 'round',
      join: 'round',
      alpha: 0.5,
    });
  }

  private drawLeaves(time: number, sway: number): void {
    for (const leaf of this.leaves) {
      const point = this.getPointAtT(leaf.t);
      const localSway = sway * (0.5 + Math.sin(leaf.t * 10) * 0.5);

      // Very subtle leaf animation
      const leafSway = noise(time * 0.05 + leaf.offset, 0) * 0.08;

      const x = point.x + localSway + leaf.side * (point.thickness * 0.5 + 2);
      const y = point.y;

      drawLeaf(
        this.graphics,
        x,
        y,
        leaf.size,
        leaf.angle + leafSway,
        VineColors.leaf
      );
    }
  }

  private drawTendrils(time: number, sway: number): void {
    for (const tendril of this.tendrils) {
      const point = this.getPointAtT(tendril.t);
      const localSway = sway * (0.5 + Math.sin(tendril.t * 10) * 0.5);

      const x = point.x + localSway + tendril.side * (point.thickness * 0.5);
      const y = point.y;

      // Subtle tendril movement
      const tendrilSway = noise(time * 0.03 + tendril.t * 100, 0) * 0.1;

      drawTendril(
        this.graphics,
        x,
        y,
        tendril.length,
        tendril.angle + tendrilSway,
        tendril.curls
      );
    }
  }

  destroy(): void {
    for (const branch of this.branches) {
      branch.destroy();
    }
    this.crownFlower.destroy();
    this.graphics.destroy();
    super.destroy();
  }
}
