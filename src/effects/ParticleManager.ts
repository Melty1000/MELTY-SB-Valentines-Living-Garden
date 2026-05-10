import { Container } from 'pixi.js';
import { Sparkles } from './Sparkles';
import { Hearts } from './Hearts';
import { EventBus, GardenEvents } from '../core/EventBus';
import type { CheerEventData } from '../connection/types';
import type { Flower } from '../garden/Flower';
import { FlowerStage } from '../garden/Flower';

export class ParticleManager extends Container {
  private sparkles: Sparkles;
  private hearts: Hearts;

  constructor() {
    super();

    this.sparkles = new Sparkles();
    this.hearts = new Hearts();

    this.addChild(this.sparkles);
    this.addChild(this.hearts);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on(GardenEvents.FLOWER_GROW, (data: { flower: Flower; stage: FlowerStage }) => {
      if (data.stage === FlowerStage.FullBloom) {
        this.emitSparkles(data.flower.x, data.flower.y, 30);
      } else if (data.stage === FlowerStage.Blooming) {
        this.emitSparkles(data.flower.x, data.flower.y, 15);
      }
    });

    EventBus.on(GardenEvents.HEART_SPAWN, (data: { heart: { x: number; y: number } }) => {
      this.emitHearts(data.heart.x, data.heart.y, 15);
    });

    EventBus.on<CheerEventData>(GardenEvents.CHEER, (data) => {
      const intensity = Math.min(data.bits / 100, 5);
      this.emitSparkles(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.5,
        Math.floor(20 * intensity)
      );
    });

    EventBus.on(GardenEvents.DANCE_START, () => {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.emitHearts(
            Math.random() * window.innerWidth,
            window.innerHeight * 0.8,
            10
          );
        }, i * 200);
      }
    });
  }

  emitSparkles(x: number, y: number, count?: number): void {
    this.sparkles.spawn(x, y, count);
  }

  emitHearts(x: number, y: number, count?: number): void {
    this.hearts.spawn(x, y, count);
  }

  update(deltaTime: number): void {
    this.sparkles.update(deltaTime);
    this.hearts.update(deltaTime);
  }

  clear(): void {
    this.sparkles.clear();
    this.hearts.clear();
  }

  override destroy(): void {
    this.sparkles.destroy();
    this.hearts.destroy();
    super.destroy();
  }
}
