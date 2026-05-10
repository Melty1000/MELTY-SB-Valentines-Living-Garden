import { Container, Graphics } from 'pixi.js';
import { drawFlower, drawBud, drawSeed, generateFlowerShape, type FlowerShape } from '../utils/procedural';
import { lerp, easeOutElastic } from '../utils/math';
import { config } from '../config';

export enum FlowerStage {
  Seed = 0,
  Bud = 1,
  Blooming = 2,
  FullBloom = 3,
}

export interface FlowerData {
  userId: string;
  userName: string;
  displayName: string;
  messageCount: number;
}

export class Flower extends Container {
  private graphics: Graphics;
  private shape: FlowerShape;
  private _stage: FlowerStage = FlowerStage.Seed;
  private targetStage: FlowerStage = FlowerStage.Seed;
  private transitionProgress: number = 1;
  private baseScale: number = 1;
  private wobbleOffset: number = 0;
  private wobbleAmount: number = 0;

  public data: FlowerData;
  public size: number;

  constructor(data: FlowerData, color: number, size: number = config.flower.maxSize) {
    super();
    this.data = data;
    this.size = size;
    this.graphics = new Graphics();
    this.addChild(this.graphics);
    this.shape = generateFlowerShape(color, size);
    this.wobbleOffset = Math.random() * Math.PI * 2;
    this.draw();
  }

  get stage(): FlowerStage {
    return this._stage;
  }

  setStage(stage: FlowerStage): void {
    if (stage > this._stage) {
      this.targetStage = stage;
      this.transitionProgress = 0;
    }
  }

  updateFromMessageCount(count: number, milestones: { bud: number; bloom: number; full: number }): void {
    this.data.messageCount = count;

    if (count >= milestones.full) {
      this.setStage(FlowerStage.FullBloom);
    } else if (count >= milestones.bloom) {
      this.setStage(FlowerStage.Blooming);
    } else if (count >= milestones.bud) {
      this.setStage(FlowerStage.Bud);
    }
  }

  startWobble(intensity: number = 1): void {
    this.wobbleAmount = 0.3 * intensity;
  }

  stopWobble(): void {
    this.wobbleAmount = 0;
  }

  update(deltaTime: number, windOffset: number = 0): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / config.flower.growthDuration;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this._stage = this.targetStage;
      }
      this.draw();
    }

    const wobble = Math.sin(performance.now() * 0.005 + this.wobbleOffset) * this.wobbleAmount;
    const wind = windOffset * 0.02;
    this.rotation = wobble + wind;

    if (this.wobbleAmount > 0) {
      this.wobbleAmount *= 0.98;
      if (this.wobbleAmount < 0.01) {
        this.wobbleAmount = 0;
      }
    }
  }

  private draw(): void {
    this.graphics.clear();

    const progress = easeOutElastic(this.transitionProgress);
    const currentStage = this._stage;
    const nextStage = this.targetStage;

    if (currentStage === nextStage || this.transitionProgress >= 1) {
      this.drawStage(nextStage, 1);
    } else {
      const blendedOpenness = lerp(
        this.getOpennessForStage(currentStage),
        this.getOpennessForStage(nextStage),
        progress
      );
      this.drawWithOpenness(blendedOpenness, nextStage);
    }

    const scale = this.baseScale * (0.5 + progress * 0.5);
    this.graphics.scale.set(scale);
  }

  private getOpennessForStage(stage: FlowerStage): number {
    switch (stage) {
      case FlowerStage.Seed:
        return 0;
      case FlowerStage.Bud:
        return 0.2;
      case FlowerStage.Blooming:
        return 0.6;
      case FlowerStage.FullBloom:
        return 1;
    }
  }

  private drawStage(stage: FlowerStage, _progress: number): void {
    switch (stage) {
      case FlowerStage.Seed:
        drawSeed(this.graphics, 0, 0, this.size, this.shape.color);
        break;
      case FlowerStage.Bud:
        drawBud(this.graphics, 0, 0, this.size, this.shape.color);
        break;
      case FlowerStage.Blooming:
        drawFlower(this.graphics, 0, 0, this.shape, 0.6);
        break;
      case FlowerStage.FullBloom:
        drawFlower(this.graphics, 0, 0, this.shape, 1);
        break;
    }
  }

  private drawWithOpenness(openness: number, stage: FlowerStage): void {
    if (stage === FlowerStage.Seed) {
      drawSeed(this.graphics, 0, 0, this.size, this.shape.color);
    } else if (openness < 0.3) {
      drawBud(this.graphics, 0, 0, this.size, this.shape.color);
    } else {
      drawFlower(this.graphics, 0, 0, this.shape, openness);
    }
  }

  isFullyBloomed(): boolean {
    return this._stage === FlowerStage.FullBloom && this.transitionProgress >= 1;
  }

  destroy(): void {
    this.graphics.destroy();
    super.destroy();
  }
}
