import { type Renderer } from 'pixi.js';
import { generateFlowerShape, type FlowerShape } from '../../utils/procedural';
import { lerp, easeOutCubic } from '../../utils/math';
import { config } from '../../config';
import { FlowerCache, CacheType } from './FlowerCache';

export enum FlowerStage {
  Seed = 0,
  Bud = 1,
  Blooming = 2,
  FullBloom = 3,
  MegaBloom = 4,
  Radiant = 5,
}

export interface FlowerData {
  userId: string;
  userName: string;
  displayName: string;
  messageCount: number;
  color?: string;
}

export interface FlowerRenderData {
  texture: any;
  glowTexture?: any;
  scale: number;
  radiantFactor: number;
  isProcedural: boolean;
  stage: FlowerStage;
  openness: number;
  color: number;
  size: number;
}

export class Flower {
  private shape: FlowerShape;
  private _stage: FlowerStage = FlowerStage.Seed;
  private targetStage: FlowerStage = FlowerStage.Seed;
  private transitionProgress: number = 1;
  private baseScale: number = 1;
  private wobbleOffset: number = 0;
  private wobbleAmount: number = 0;
  private seed: number;
  private color: number;
  private lastInteraction: number;
  // Apex Predator Optimization: Reuse render data object
  private cachedRenderData: FlowerRenderData;

  // Manual transform properties since we no longer extend Container
  public x: number = 0;
  public y: number = 0;
  public rotation: number = 0;

  public data: FlowerData;
  public size: number;

  constructor(data: FlowerData, color: number, seed: number = Math.random() * 10000) {
    this.data = data;
    this.color = color;
    this.seed = seed;
    // Ensure color is formatted correctly for Twitch parsing
    // Only overwrite if it's not already set correctly to avoid mutation issues
    if (!this.data.color || !this.data.color.startsWith('#')) {
      this.data.color = `#${color.toString(16).padStart(6, '0')}`;
    }
    this.size = config.flower.sizes.seed;

    this.shape = generateFlowerShape(color, this.size, seed);
    this.wobbleOffset = (seed * 16807) % (Math.PI * 2);
    this.lastInteraction = performance.now() * 0.001;
    this.cachedRenderData = {
      texture: null,
      glowTexture: null,
      scale: 1,
      radiantFactor: 1,
      isProcedural: true,
      stage: FlowerStage.Seed,
      openness: 0,
      color: color,
      size: this.size
    };
  }

  public touch(): void {
    this.lastInteraction = performance.now() * 0.001;
  }

  public getLastInteraction(): number {
    return this.lastInteraction;
  }

  private getSizeForStage(stage: FlowerStage): number {
    const sizes = config.flower.sizes;
    switch (stage) {
      case FlowerStage.Seed: return sizes.seed;
      case FlowerStage.Bud: return sizes.bud;
      case FlowerStage.Blooming: return sizes.blooming;
      case FlowerStage.FullBloom: return sizes.fullBloom;
      case FlowerStage.MegaBloom: return sizes.megaBloom;
      case FlowerStage.Radiant: return sizes.radiant;
      default: return sizes.seed;
    }
  }

  get stage(): FlowerStage { return this._stage; }

  setStage(stage: FlowerStage): void {
    if (stage > this._stage) {
      this.targetStage = stage;
      this.transitionProgress = 0;
      this.size = this.getSizeForStage(stage);
      this.shape = generateFlowerShape(this.color, this.size, this.seed);
    }
  }

  setImmediateStage(stage: FlowerStage): void {
    this._stage = stage;
    this.targetStage = stage;
    this.transitionProgress = 1;
    this.size = this.getSizeForStage(stage);
    this.shape = generateFlowerShape(this.color, this.size, this.seed);
  }

  updateFromMessageCount(count: number, milestones: { bud: number; bloom: number; full: number; mega?: number; radiant?: number }, immediate: boolean = false): void {
    this.data.messageCount = count;
    let newStage = FlowerStage.Seed;
    if (milestones.radiant && count >= milestones.radiant) newStage = FlowerStage.Radiant;
    else if (milestones.mega && count >= milestones.mega) newStage = FlowerStage.MegaBloom;
    else if (count >= milestones.full) newStage = FlowerStage.FullBloom;
    else if (count >= milestones.bloom) newStage = FlowerStage.Blooming;
    else if (count >= milestones.bud) newStage = FlowerStage.Bud;

    if (immediate) this.setImmediateStage(newStage);
    else this.setStage(newStage);
  }

  startWobble(intensity: number = 1): void { this.wobbleAmount = 0.3 * intensity; }
  stopWobble(): void { this.wobbleAmount = 0; }

  update(deltaTime: number, windOffset: number = 0): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress += deltaTime / (config.flower.growthDuration * 0.001);
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this._stage = this.targetStage;
        this.size = this.getSizeForStage(this._stage);
        this.shape = generateFlowerShape(this.color, this.size, this.seed);
      }
    }

    // Only update rotation/wobble if necessary to save CPU
    const hasWobble = this.wobbleAmount > 0;
    const hasWind = Math.abs(windOffset) > 0.01;

    if (hasWobble || hasWind) {
      const wobble = hasWobble ? Math.sin(performance.now() * 0.005 + this.wobbleOffset) * this.wobbleAmount : 0;
      const wind = windOffset * 0.02;
      this.rotation = wobble + wind;
    }

    if (hasWobble) {
      this.wobbleAmount *= Math.pow(0.2, deltaTime);
      if (this.wobbleAmount < 0.01) {
        this.wobbleAmount = 0;
        if (!hasWind) this.rotation = 0;
      }
    }
  }

  /**
   * Returns the current render state for the external ParticleContainer manager.
   */
  public getRenderData(renderer?: Renderer): FlowerRenderData {
    const progress = easeOutCubic(this.transitionProgress);
    const currentStage = this._stage;
    const nextStage = this.targetStage;

    const getStageScale = (s: FlowerStage) => {
      // Radiant and MegaBloom should be same size
      if (s === FlowerStage.Radiant) return 1.2;
      if (s === FlowerStage.MegaBloom) return 1.2;
      return 1.0;
    };

    const blendedScaleMultiplier = this.transitionProgress >= 1
      ? getStageScale(nextStage)
      : lerp(getStageScale(currentStage), getStageScale(nextStage), progress);

    const blendedOpenness = this.transitionProgress >= 1
      ? this.getOpennessForStage(nextStage)
      : lerp(this.getOpennessForStage(currentStage), this.getOpennessForStage(nextStage), progress);

    const scale = this.baseScale * blendedScaleMultiplier;
    // radiantFactor is ONLY for glow pulsing, NOT for flower size
    let radiantFactor = 1.0;
    let glowTexture = null;

    if (nextStage === FlowerStage.Radiant) {
      const time = performance.now() * 0.0015;
      radiantFactor = 1.0 + Math.sin(time) * 0.12;  // Only applies to glow sprite
      if (renderer) {
        glowTexture = FlowerCache.getTexture(renderer, CacheType.Glow, this.shape.petalLength, this.shape.color);
      }
    }

    // For ParticleContainer, we MUST have a texture.
    // If we are in transition (procedural), the manager handles falling back to a Graphics layer.
    let texture = null;
    if (renderer && this.transitionProgress >= 1) {
      const type = nextStage === FlowerStage.Seed ? CacheType.Seed :
        nextStage === FlowerStage.Bud ? CacheType.Bud :
          CacheType.Rose;

      texture = FlowerCache.getTexture(
        renderer,
        type,
        this.size,
        this.shape.color,
        blendedOpenness
      );
    }

    // Write to cache
    const d = this.cachedRenderData;
    d.texture = texture;
    d.glowTexture = glowTexture;
    d.scale = scale;
    d.radiantFactor = radiantFactor;
    d.isProcedural = this.transitionProgress < 1;
    d.stage = nextStage;
    d.openness = blendedOpenness;
    d.color = this.color;
    d.size = this.size;

    return d;
  }

  private getOpennessForStage(stage: FlowerStage): number {
    switch (stage) {
      case FlowerStage.Seed: return 0;
      case FlowerStage.Bud: return 0.2;
      case FlowerStage.Blooming: return 0.6;
      case FlowerStage.FullBloom:
      case FlowerStage.MegaBloom:
      case FlowerStage.Radiant: return 1;
    }
  }

  isFullyBloomed(): boolean { return this._stage === FlowerStage.FullBloom && this.transitionProgress >= 1; }

  destroy(): void {
    // No PIXI objects to destroy anymore
  }
}
