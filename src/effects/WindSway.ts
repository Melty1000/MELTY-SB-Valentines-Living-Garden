import { EventBus, GardenEvents } from '../core/EventBus';
import { noise } from '../utils/math';
import { config } from '../config';

export class WindSway {
  private baseOffset: number = 0;
  private gustOffset: number = 0;
  private gustActive: boolean = false;
  private gustEndTime: number = 0;
  private gustTargetIntensity: number = 0;
  private timeOffset: number;

  constructor() {
    this.timeOffset = Math.random() * 1000;
  }

  update(_deltaTime: number): number {
    const time = performance.now() * 0.001 + this.timeOffset;

    // Very subtle base movement - barely perceptible breathing
    this.baseOffset = noise(time * config.wind.baseSpeed * 50, 0) * 5;

    // Occasional gentle gusts
    if (!this.gustActive && Math.random() < config.wind.gustChance) {
      this.startGust();
    }

    if (this.gustActive) {
      const now = performance.now();
      if (now >= this.gustEndTime) {
        this.gustActive = false;
        this.gustOffset = 0;
      } else {
        const progress = 1 - (this.gustEndTime - now) / config.wind.gustDuration;
        // Smooth ease in/out curve
        const gustCurve = Math.sin(progress * Math.PI);
        this.gustOffset = this.gustTargetIntensity * gustCurve * 8;
      }
    }

    const totalOffset = this.baseOffset + this.gustOffset;
    EventBus.emit(GardenEvents.WIND_CHANGE, totalOffset);

    return totalOffset;
  }

  private startGust(): void {
    this.gustActive = true;
    this.gustEndTime = performance.now() + config.wind.gustDuration;
    this.gustTargetIntensity = (Math.random() * 0.5 + 0.5) * config.wind.gustIntensity;

    // Random direction
    if (Math.random() > 0.5) {
      this.gustTargetIntensity *= -1;
    }
  }

  forceGust(intensity: number = 1): void {
    this.gustActive = true;
    this.gustEndTime = performance.now() + config.wind.gustDuration;
    this.gustTargetIntensity = intensity * config.wind.gustIntensity;
  }

  getOffset(): number {
    return this.baseOffset + this.gustOffset;
  }
}
