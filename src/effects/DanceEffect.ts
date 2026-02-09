import { EventBus, GardenEvents } from '../core/EventBus';
import type { FlowerManager } from '../garden/flowers/FlowerManager';
import { config } from '../config';

export class DanceEffect {
  private flowerManager: FlowerManager;
  private isActive: boolean = false;
  private startTime: number = 0;
  private interval: number | null = null;

  private tracker = EventBus.createTracker();

  constructor(flowerManager: FlowerManager) {
    this.flowerManager = flowerManager;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const { on } = this.tracker;
    on(GardenEvents.DANCE_START, () => {
      this.start();
    });

    on(GardenEvents.DANCE_END, () => {
      this.stop();
    });
  }

  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = performance.now();

    this.flowerManager.triggerWiggle();

    this.interval = window.setInterval(() => {
      if (this.isActive) {
        this.flowerManager.triggerWiggle();
      }
    }, 500);

    console.log('[DanceEffect] Started');
  }

  stop(): void {
    this.isActive = false;

    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('[DanceEffect] Stopped');
  }

  update(_deltaTime: number): void {
    if (!this.isActive) return;

    const elapsed = performance.now() - this.startTime;
    if (elapsed >= config.dance.duration) {
      this.stop();
    }
  }

  isRunning(): boolean {
    return this.isActive;
  }

  destroy(): void {
    this.tracker.unsubscribeAll();
    this.stop();
  }
}
