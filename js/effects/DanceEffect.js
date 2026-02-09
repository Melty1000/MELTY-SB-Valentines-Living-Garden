import { EventBus, GardenEvents } from '../core/EventBus.js';
import { config } from '../config.js';

export class DanceEffect {
  flowerManager;
  isActive = false;
  startTime = 0;
  interval);

  constructor(flowerManager) {
    this.flowerManager = flowerManager;
    this.setupEventListeners();
  }
  setupEventListeners() {
    const { on } = this.tracker;
    on(GardenEvents.DANCE_START, () => {
      this.start();
    });

    on(GardenEvents.DANCE_END, () => {
      this.stop();
    });
  }

  start() {
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

  stop() {
    this.isActive = false;

    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }

    console.log('[DanceEffect] Stopped');
  }

  update(_deltaTime) {
    if (!this.isActive) return;

    const elapsed = performance.now() - this.startTime;
    if (elapsed >= config.dance.duration) {
      this.stop();
    }
  }

  isRunning() {
    return this.isActive;
  }

  destroy() {
    this.tracker.unsubscribeAll();
    this.stop();
  }
}
