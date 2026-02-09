import { Container } from 'pixi.js';
import { Sparkles } from './Sparkles.js';
import { Hearts } from './Hearts.js';
import { Petals } from './Petals.js';
import { EventBus, GardenEvents } from '../core/EventBus.js';
import { FlowerStage } from '../garden/flowers/Flower.js';

export class ParticleManager extends Container {
  sparkles;
  hearts;
  petals;
  tracker = EventBus.createTracker();

  constructor(renderer) {
    super();

    this.sparkles = new Sparkles(renderer);
    this.hearts = new Hearts(renderer);
    this.petals = new Petals(renderer);

    this.addChild(this.sparkles);
    this.addChild(this.hearts);
    this.addChild(this.petals);

    this.setupEventListeners();
  }
  setupEventListeners() {
    const { on } = this.tracker;

    on(GardenEvents.FLOWER_GROW, (data: { flower; stage, interaction?: boolean }) => {
      if (data.interaction && data.stage === FlowerStage.Radiant) {
        this.emitSparkles(data.flower.x, data.flower.y, 5);
        return;
      }

      if (data.stage === FlowerStage.Radiant) {
        this.emitSparkles(data.flower.x, data.flower.y, 50);
      } else if (data.stage === FlowerStage.FullBloom || data.stage === FlowerStage.MegaBloom) {
        this.emitSparkles(data.flower.x, data.flower.y, 30);
      } else if (data.stage === FlowerStage.Blooming) {
        this.emitSparkles(data.flower.x, data.flower.y, 15);
      }
    });

    on(GardenEvents.HEART_SPAWN, (data: { heart: { x; y: number }, count?: number, palette?: number[] }) => {
      this.emitHearts(data.heart.x, data.heart.y, data.count || 15, data.palette);
    });

    on(GardenEvents.PETAL_SPAWN, (data: { x; y, count?: number, palette?: number[] }) => {
      this.emitPetals(data.x, data.y, data.count || 10, data.palette);
    });

    on(GardenEvents.PETAL_RAIN, (data: { count?: number, palette?: number[] }) => {
      this.emitPetalRain(data.count || 20, data.palette);
    });

    on(GardenEvents.CHEER, (data) => {
      const intensity = Math.min(data.bits / 100, 5);
      this.emitSparkles(
        Math.random() * window.innerWidth,
        Math.random() * window.innerHeight * 0.5,
        Math.floor(20 * intensity)
      );
    });
  }

  emitSparkles(x, y, count?: number) {
    this.sparkles.spawn(x, y, count);
  }

  emitHearts(x, y, count?: number, palette?: number[]) {
    this.hearts.spawn(x, y, count, palette);
  }

  emitPetals(x, y, count?: number, palette?: number[]) {
    this.petals.spawn(x, y, count, palette);
  }

  emitPetalRain(count, palette?: number[]) {
    // Mode 'rain' handles random positioning and falling logic
    this.petals.spawn(0, 0, count, palette, 'rain');
  }

  update(deltaTime) {
    this.sparkles.update(deltaTime);
    this.hearts.update(deltaTime);
    this.petals.update(deltaTime);
  }

  clear() {
    this.sparkles.clear();
    this.hearts.clear();
    this.petals.clear();
  }

  override destroy() {
    this.tracker.unsubscribeAll();
    this.sparkles.destroy();
    this.hearts.destroy();
    this.petals.destroy();
    super.destroy();
  }
}
