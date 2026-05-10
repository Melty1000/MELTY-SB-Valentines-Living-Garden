import { Container, Graphics } from 'pixi.js';
import { noise } from '../utils/math';
import { VineColors } from '../utils/colors';
import { drawLeaf } from '../utils/procedural';
import { config } from '../config';

export interface BranchAttachmentPoint {
  x: number;
  y: number;
  angle: number;
  occupied: boolean;
}

interface BranchLeaf {
  t: number;
  side: number;
  angle: number;
  size: number;
}

export class VineBranch extends Container {
  private graphics: Graphics;
  private length: number;
  private baseAngle: number;
  private thickness: number;
  private attachmentPoint: BranchAttachmentPoint;
  private swayOffset: number;
  private leaves: BranchLeaf[] = [];

  constructor(
    _x: number,
    _y: number,
    angle: number,
    length: number = config.vine.branchLength,
    thickness: number = config.vine.branchThickness
  ) {
    super();
    this.baseAngle = angle;
    this.length = length;
    this.thickness = thickness;
    this.swayOffset = Math.random() * 1000;

    this.graphics = new Graphics();
    this.addChild(this.graphics);

    const endX = Math.cos(angle) * length;
    const endY = Math.sin(angle) * length;

    this.attachmentPoint = {
      x: endX,
      y: endY,
      angle: angle - Math.PI / 2,
      occupied: false,
    };

    this.generateLeaves();
    this.draw(0);
  }

  private generateLeaves(): void {
    // Add 2-4 small leaves along the branch
    const leafCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < leafCount; i++) {
      const t = 0.2 + (i / leafCount) * 0.6;
      const side = i % 2 === 0 ? 1 : -1;

      this.leaves.push({
        t,
        side,
        angle: this.baseAngle + (Math.PI / 3) * side,
        size: 8 + Math.random() * 6,
      });
    }
  }

  getAttachmentPoint(): BranchAttachmentPoint {
    return {
      ...this.attachmentPoint,
      x: this.x + this.attachmentPoint.x,
      y: this.y + this.attachmentPoint.y,
    };
  }

  isOccupied(): boolean {
    return this.attachmentPoint.occupied;
  }

  setOccupied(occupied: boolean): void {
    this.attachmentPoint.occupied = occupied;
  }

  update(time: number, windOffset: number = 0): void {
    this.draw(time, windOffset);
  }

  private draw(time: number, windOffset: number = 0): void {
    this.graphics.clear();

    // Very subtle sway
    const sway = noise(time * config.vine.swaySpeed * 0.5 + this.swayOffset, 0) * 0.02;
    const windSway = windOffset * 0.002;

    const currentAngle = this.baseAngle + sway + windSway;

    // Draw branch as a curved line with tapering thickness
    const segments = 6;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Slight curve to the branch
      const curve = Math.sin(t * Math.PI) * this.length * 0.05;
      const perpAngle = currentAngle + Math.PI / 2;

      const x = Math.cos(currentAngle) * this.length * t + Math.cos(perpAngle) * curve;
      const y = Math.sin(currentAngle) * this.length * t + Math.sin(perpAngle) * curve;
      points.push({ x, y });
    }

    // Draw shadow
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x + 1, points[0].y + 1);
    for (let i = 1; i < points.length; i++) {
      this.graphics.lineTo(points[i].x + 1, points[i].y + 1);
    }
    this.graphics.stroke({
      width: this.thickness + 2,
      color: VineColors.dark,
      cap: 'round',
      join: 'round',
      alpha: 0.3,
    });

    // Draw main branch with tapering
    for (let i = 0; i < points.length - 1; i++) {
      const t = i / (points.length - 1);
      const segmentThickness = this.thickness * (1 - t * 0.6); // Taper from thick to thin

      this.graphics.beginPath();
      this.graphics.moveTo(points[i].x, points[i].y);
      this.graphics.lineTo(points[i + 1].x, points[i + 1].y);
      this.graphics.stroke({
        width: segmentThickness,
        color: VineColors.stem,
        cap: 'round',
        join: 'round',
      });
    }

    // Draw highlight
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x - 1, points[0].y - 0.5);
    for (let i = 1; i < points.length - 1; i++) {
      this.graphics.lineTo(points[i].x - 1, points[i].y - 0.5);
    }
    this.graphics.stroke({
      width: this.thickness * 0.25,
      color: VineColors.light,
      cap: 'round',
      join: 'round',
      alpha: 0.4,
    });

    // Draw leaves
    for (const leaf of this.leaves) {
      const leafIndex = Math.floor(leaf.t * (points.length - 1));
      const p = points[leafIndex];

      const leafSway = noise(time * 0.05 + this.swayOffset + leaf.t * 10, 0) * 0.1;

      drawLeaf(
        this.graphics,
        p.x,
        p.y,
        leaf.size,
        leaf.angle + leafSway + windSway,
        VineColors.leaf
      );
    }

    // Update attachment point to end of branch
    const endPoint = points[points.length - 1];
    this.attachmentPoint.x = endPoint.x;
    this.attachmentPoint.y = endPoint.y;
  }

  override destroy(): void {
    this.graphics.destroy();
    super.destroy();
  }
}
