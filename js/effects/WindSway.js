import { EventBus, GardenEvents } from '../core/EventBus.js';
import { noise } from '../utils/math.js';
import { config } from '../config.js';

export class WindSway {
  baseOffset = 0;
  gustOffset = 0;
  gustActive = false;
  gustEndTime = 0;
  gustTargetIntensity = 0;
  baseSpeed = 1;

  constructor() {
  }

  setBaseSpeed(speed) {
    this.baseSpeed = speed;
  }

  getBaseSpeed() {
    return this.baseSpeed;
  }

  update(time) {
    // Base offset disabled - vine strands animate independently now
    // Only gusts will cause synchronized motion (on raids/subs)
    this.baseOffset = 0;

    // Occasional gentle gusts
    if (!this.gustActive && Math.random() < config.wind.gustChance) {
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
  startGust(currentTime) {
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

  forceGust(currentTime, intensity = 1) {
    // Convert ms to seconds for consistency with time parameter
    const durationSeconds = (config.wind.gustDuration || 3000) / 1000;
    this.gustActive = true;
    this.gustEndTime = currentTime + durationSeconds;
    this.gustTargetIntensity = intensity * config.wind.gustIntensity;
  }

  getOffset() {
    return this.baseOffset + this.gustOffset;
  }
}
