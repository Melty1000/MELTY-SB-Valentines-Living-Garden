import { noise } from '../../utils/math.js';
import { config } from '../../config.js';
import {
    VinePoint,
    ThornData,
    LeafData,
    TwigData,
    AttachmentPoint
} from './VineTypes.js';

export class VineSimulator {
  width;
  height;
  vinePoints = [];
  thorns = [];
  leaves = [];
  twigs = [];
  attachmentPoints = [];
  totalLength = 0;

    constructor(width, height, _isBackground) {
        this.width = width;
        this.height = height;
        // isBackground stored in coordinator to decide noise seeds
    }
  generateVinePath() {
        this.vinePoints = [];
        const perimeter = (this.width * 2 + this.height * 2);
        const segments = Math.max(300, Math.ceil(perimeter / 8));
        const r = this.height * 0.06;
        const leftX = this.width * 0.03;
        const rightX = this.width * 0.97;
        const topY = this.height * 0.06;
        const bottomY = this.height * 0.95;
        const centerX = this.width / 2;

        const sideW = rightX - leftX - 2 * r;
        const sideH = bottomY - topY - 2 * r;
        const arcL = (Math.PI / 2) * r;
        const totalL = (sideW * 2) + (sideH * 2) + (arcL * 4);

        const rH = (sideW / 2) / totalL;
        const rA = arcL / totalL;
        const rV = sideH / totalL;

        const t1 = rH;
        const t2 = t1 + rA;
        const t3 = t2 + rV;
        const t4 = t3 + rA;
        const t5 = 0.5;
        const t6 = t5 + rH;
        const t7 = t6 + rA;
        const t8 = t7 + rV;
        const t9 = t8 + rA;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            let x, y;

            if (t < t1) {
                const localT = t / rH;
                x = centerX - (centerX - (leftX + r)) * localT;
                y = bottomY;
            } else if (t < t2) {
                const localT = (t - t1) / rA;
                const angle = Math.PI / 2 + (localT * Math.PI / 2);
                x = leftX + r + Math.cos(angle) * r; y = bottomY - r + Math.sin(angle) * r;
            } else if (t < t3) {
                const localT = (t - t2) / rV;
                x = leftX; y = (bottomY - r) - (bottomY - r - (topY + r)) * localT;
            } else if (t < t4) {
                const localT = (t - t3) / rA;
                const angle = Math.PI + (localT * Math.PI / 2);
                x = leftX + r + Math.cos(angle) * r; y = topY + r + Math.sin(angle) * r;
            } else if (t < t5) {
                const localT = (t - t4) / rH;
                x = (leftX + r) + (centerX - (leftX + r)) * localT;
                y = topY;
            } else if (t < t6) {
                const localT = (t - t5) / rH;
                x = centerX + (rightX - r - centerX) * localT;
                y = topY;
            } else if (t < t7) {
                const localT = (t - t6) / rA;
                const angle = -Math.PI / 2 + (localT * Math.PI / 2);
                x = rightX - r + Math.cos(angle) * r; y = topY + r + Math.sin(angle) * r;
            } else if (t < t8) {
                const localT = (t - t7) / rV;
                x = rightX; y = (topY + r) + (bottomY - r - (topY + r)) * localT;
            } else if (t < t9) {
                const localT = (t - t8) / rA;
                const angle = 0 + (localT * Math.PI / 2);
                x = rightX - r + Math.cos(angle) * r; y = bottomY - r + Math.sin(angle) * r;
            } else {
                const localT = (t - t9) / rH;
                x = (rightX - r) - (rightX - r - centerX) * localT;
                y = bottomY;
            }
            this.vinePoints.push({
                x, y, thickness: config.vine.thickness, len,
                // Pre-calculate static helix properties to save 2x noise calls per frame
                warp,
                nx, ny: 0
            });
        }

        this.vinePoints[0].len = 0;
        for (let i = 1; i < this.vinePoints.length; i++) {
            const p1 = this.vinePoints[i - 1];
            const p2 = this.vinePoints[i];
            p2.len = p1.len + Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        }
        this.totalLength = this.vinePoints[this.vinePoints.length - 1].len;

        // Pre-calculate normals
        for (let i = 0; i < this.vinePoints.length; i++) {
            const p = this.vinePoints[i];
            const next = this.vinePoints[Math.min(i + 1, this.vinePoints.length - 1)];
            const prev = this.vinePoints[Math.max(i - 1, 0)];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            p.nx = -dy / len;
            p.ny = dx / len;
        }

        // Pre-calculate helix warp
        const centerLen = (this.totalLength * 0.5);
        const warpScale = 0.003;
        const warpAmp = 2.5;
        const centerWarp = noise(centerLen * warpScale, 0) * warpAmp;

        for (const p of this.vinePoints) {
            const localWarp = noise(p.len * warpScale, 0) * warpAmp - centerWarp;
            p.warp = localWarp;
        }
    }
  generateFoliage() {
        this.leaves = [];
        this.twigs = [];
        const steps = 600;
        const leafChance = 0.45;
        const twigChance = 0.12;

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            if (t < 0.02 || t > 0.98 || Math.abs(t - 0.5) < 0.015) continue;

            for (let s = 0; s < 2; s++) {
                const p = this.getPointAtT(t);
                const helixAngle = this.getHelixAngle(p.len, s * Math.PI, p.warp);
                const val = Math.sin(helixAngle);

                if (Math.abs(val) > 0.7 && Math.random() < leafChance) {
                    this.leaves.push({
                        t, strandIdx,
                        angleOffset: (s === 0 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 1.5),
                        size: 8 + Math.random() * 12,
                        flip: Math.random() > 0.5
                    });
                }

                if (Math.abs(val) > 0.9 && Math.random() < twigChance) {
                    this.twigs.push({
                        t, strandIdx,
                        angleOffset: (s === 0 ? 1 : -1) * (Math.PI * 0.4 + Math.random() * Math.PI * 0.6),
                        length: 15 + Math.random() * 25,
                        curls: 1 + Math.random() * 2,
                        curlSign: Math.random() > 0.5 ? 1 : -1
                    });
                }
            }
        }
    }
  generateThorns() {
        this.thorns = [];
        const steps = 1500;
        let lastThornT = -100;
        const minThornDist = 0.02;

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            if (t < 0.02 || t > 0.98 || Math.abs(t - 0.5) < 0.035 || t - lastThornT < minThornDist) continue;

            for (let s = 0; s < 2; s++) {
                const p = this.getPointAtT(t);
                const helixAngle = this.getHelixAngle(p.len, s * Math.PI, p.warp);
                if (Math.abs(Math.sin(helixAngle)) > 0.8 && Math.random() < (config.vine.thornChance || 0.6)) {
                    this.thorns.push({
                        t, strandIdx,
                        angleOffset: (s === 0 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.8),
                        size: 3 + Math.random() * 4
                    });
                    lastThornT = t;
                }
            }
        }
    }
  getPointAtT(t) {
        const idx = Math.floor(Math.max(0, Math.min(1, t)) * (this.vinePoints.length - 1));
        return this.vinePoints[idx];
    }
  getHelixAngle(len, phaseOffset, warp) {
        const centerLen = (this.totalLength * 0.5);
        const relativeLen = len - centerLen;
        const pixelsPerCycle = 150;
        const freq = (Math.PI * 2) / pixelsPerCycle;
        return relativeLen * freq + phaseOffset + warp;
    }
}
