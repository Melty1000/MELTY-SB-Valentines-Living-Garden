import { Container } from 'pixi.js';
import { Vine } from './Vine';
import { FlowerManager } from './FlowerManager';
import { EventBus, GardenEvents } from '../core/EventBus';
import type { GiftBombEventData } from '../connection/types';
import { config } from '../config';

export class Garden extends Container {
  private vine: Vine;
  private flowerManager: FlowerManager;
  private windOffset: number = 0;
  private isDancing: boolean = false;
  private danceEndTime: number = 0;

  constructor(width: number, height: number) {
    super();

    this.vine = new Vine(width, height);
    this.addChild(this.vine);

    this.flowerManager = new FlowerManager(this.vine);
    this.addChild(this.flowerManager);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on('app:resize', (data: { width: number; height: number }) => {
      this.resize(data.width, data.height);
    });

    EventBus.on<GiftBombEventData>(GardenEvents.GIFT_BOMB, (data) => {
      if (data.count >= config.giftBombThreshold) {
        this.startDance();
      }
    });

    EventBus.on(GardenEvents.WIND_CHANGE, (offset: number) => {
      this.windOffset = offset;
    });
  }

  resize(width: number, height: number): void {
    this.vine.resize(width, height);
  }

  startDance(): void {
    if (this.isDancing) return;

    this.isDancing = true;
    this.danceEndTime = performance.now() + config.dance.duration;

    EventBus.emit(GardenEvents.DANCE_START);
    console.log('[Garden] Dance started!');

    this.flowerManager.triggerWiggle();
  }

  stopDance(): void {
    this.isDancing = false;
    EventBus.emit(GardenEvents.DANCE_END);
    console.log('[Garden] Dance ended');
  }

  update(deltaTime: number): void {
    const time = performance.now() * 0.001;

    if (this.isDancing) {
      if (performance.now() >= this.danceEndTime) {
        this.stopDance();
      } else {
        const danceWind =
          Math.sin(time * config.dance.bounceSpeed) * config.dance.intensity * 20;
        this.vine.update(time, this.windOffset + danceWind);
        this.flowerManager.update(deltaTime, this.windOffset + danceWind);
        return;
      }
    }

    this.vine.update(time, this.windOffset);
    this.flowerManager.update(deltaTime, this.windOffset);
  }

  getVine(): Vine {
    return this.vine;
  }

  getFlowerManager(): FlowerManager {
    return this.flowerManager;
  }

  destroy(): void {
    this.flowerManager.destroy();
    this.vine.destroy();
    super.destroy();
  }
}
