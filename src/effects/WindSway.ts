import { EventBus, GardenEvents } from '../core/EventBus';
import { config } from '../config';

export class WindSway {
  private baseOffset: number = 0;
  private gustOffset: number = 0;
  private gustActive: boolean = false;
  private gustEndTime: number = 0;
  private gustTargetIntensity: number = 0;
  private baseSpeed: number = 1;

  constructor() {
  }

  setBaseSpeed(speed: number): void {
    this.baseSpeed = speed;
  }

  getBaseSpeed(): number {
    return this.baseSpeed;
  }

  update(time: number): number {
    // Base offset disabled - vine strands animate independently now
    // Only gusts will cause synchronized motion (on raids/subs)
    this.baseOffset = 0;

    // Scale automatic gust frequency based on debug base speed control.
    const gustChance = Math.max(0, this.baseSpeed) * config.wind.gustChance;
    if (!this.gustActive && Math.random() < gustChance) {
      this.startGust(time);
    }

    if (this.gustActive) {
      if (time >= this.gustEndTime) {
        this.gustActive = false;
        this.gustOffset = 0;
      } else {
        // Convert ms to seconds for consistency
        const durationSeconds = (config.wind.gustDuration || 3000) / 1000;
        const progress = 1 - (this.gustEndTime - time) / durationSeconds;
        // Smooth ease in/out curve
        const gustCurve = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
        this.gustOffset = this.gustTargetIntensity * gustCurve * 8;
      }
    }

    const totalOffset = this.baseOffset + this.gustOffset;

    // Safety check just in case
    if (isNaN(totalOffset)) {
      this.gustActive = false;
      this.gustOffset = 0;
      return this.baseOffset;
    }

    EventBus.emit(GardenEvents.WIND_CHANGE, totalOffset);
    return totalOffset;
  }

  private startGust(currentTime: number): void {
    // Convert ms to seconds for consistency with time parameter
    const durationSeconds = (config.wind.gustDuration || 3000) / 1000;
    this.gustActive = true;
    this.gustEndTime = currentTime + durationSeconds;
    this.gustTargetIntensity = (Math.random() * 0.5 + 0.5) * config.wind.gustIntensity;

    // Random direction
    if (Math.random() > 0.5) {
      this.gustTargetIntensity *= -1;
    }
  }

  forceGust(currentTime: number, intensity: number = 1): void {
    // Convert ms to seconds for consistency with time parameter
    const durationSeconds = (config.wind.gustDuration || 3000) / 1000;
    this.gustActive = true;
    this.gustEndTime = currentTime + durationSeconds;
    this.gustTargetIntensity = intensity * config.wind.gustIntensity;
  }

  getOffset(): number {
    return this.baseOffset + this.gustOffset;
  }
}
