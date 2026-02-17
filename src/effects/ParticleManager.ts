import { Container, type Renderer } from 'pixi.js';
import { Sparkles } from './Sparkles';
import { Hearts } from './Hearts';
import { Petals } from './Petals';
import { EventBus, GardenEvents } from '../core/EventBus';
import type { CheerEventData } from '../connection/types';
import type { Flower } from '../garden/flowers/Flower';
import { FlowerStage } from '../garden/flowers/Flower';

export class ParticleManager extends Container {
  private sparkles: Sparkles;
  private hearts: Hearts;
  private petals: Petals;

  private tracker = EventBus.createTracker();

  constructor(renderer: Renderer) {
    super();

    this.sparkles = new Sparkles(renderer);
    this.hearts = new Hearts(renderer);
    this.petals = new Petals(renderer);

    this.addChild(this.sparkles);
    this.addChild(this.hearts);
    this.addChild(this.petals);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const { on } = this.tracker;

    on(GardenEvents.FLOWER_GROW, (data: { flower: Flower; stage: FlowerStage, interaction?: boolean }) => {
      const palette = [data.flower.getColor()];

      if (data.interaction && data.stage === FlowerStage.Radiant) {
        this.emitPetals(data.flower.x, data.flower.y, 5, palette);
        return;
      }

      if (data.stage === FlowerStage.Radiant) {
        this.emitPetals(data.flower.x, data.flower.y, 50, palette);
      } else if (data.stage === FlowerStage.FullBloom || data.stage === FlowerStage.MegaBloom) {
        this.emitPetals(data.flower.x, data.flower.y, 30, palette);
      } else if (data.stage === FlowerStage.Blooming) {
        this.emitPetals(data.flower.x, data.flower.y, 15, palette);
      }
    });

    on(GardenEvents.PETAL_SPAWN, (data: { x: number; y: number, count?: number, palette?: number[] }) => {
      this.emitPetals(data.x, data.y, data.count || 10, data.palette);
    });

    on(GardenEvents.PETAL_RAIN, (data: { count?: number, palette?: number[] }) => {
      this.emitPetalRain(data.count || 20, data.palette);
    });

    on<CheerEventData>(GardenEvents.CHEER, (data) => {
      const intensity = Math.min(data.bits / 100, 5);
      this.emitPetals(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.5,
        Math.floor(20 * intensity)
      );
    });
  }

  emitSparkles(x: number, y: number, count?: number): void {
    this.sparkles.spawn(x, y, count);
  }

  emitHearts(x: number, y: number, count?: number, palette?: number[]): void {
    this.hearts.spawn(x, y, count, palette);
  }

  emitPetals(x: number, y: number, count?: number, palette?: number[]): void {
    this.petals.spawn(x, y, count, palette);
  }

  emitPetalRain(count: number, palette?: number[]): void {
    // Mode 'rain' handles random positioning and falling logic
    this.petals.spawn(0, 0, count, palette, 'rain');
  }

  update(deltaTime: number): void {
    this.sparkles.update(deltaTime);
    this.hearts.update(deltaTime);
    this.petals.update(deltaTime);
  }

  clear(): void {
    this.sparkles.clear();
    this.hearts.clear();
    this.petals.clear();
  }

  override destroy(): void {
    this.tracker.unsubscribeAll();
    this.sparkles.destroy();
    this.hearts.destroy();
    this.petals.destroy();
    super.destroy();
  }
}
