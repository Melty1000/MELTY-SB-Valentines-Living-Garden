import { Container, BlurFilter } from 'pixi.js';
import { Vine } from './Vine.js';
import { FlowerManager } from './flowers/FlowerManager.js';
import { EventBus, GardenEvents } from '../core/EventBus.js';
import { config } from '../config.js';
import { PersistenceManager } from '../core/PersistenceManager.js';

export class Garden extends Container {
  frontVine;
  backVine;
  flowerManager;
  windOffset = 0;
  isDancing = false;
  danceEndTime = 0;

  constructor(width, height, renderer?: any) {
    super();

    // 1. Background Vine (Parallax)
    this.backVine = new Vine(width, height, true);
    this.backVine.alpha = 0.4;
    const blur = new BlurFilter();
    blur.strength = 2.5;
    this.backVine.filters = [blur];
    this.addChild(this.backVine);

    // 2. Front Vine (Main)
    this.frontVine = new Vine(width, height, false);
    this.addChild(this.frontVine);

    this.flowerManager = new FlowerManager(this.frontVine);

    // Inject renderer for caching
    if (renderer) {
      this.flowerManager.setRenderer(renderer);
      this.frontVine.setRenderer(renderer);
      this.backVine.setRenderer(renderer);
    }

    this.addChild(this.flowerManager);

    this.setupEventListeners();

    // 3. Restore State
    this.restoreFromPersistence();
  }
  setupEventListeners() {
    EventBus.on('app:resize', (data: { width; height: number }) => {
      this.resize(data.width, data.height);
    });

    EventBus.on(GardenEvents.GIFT_BOMB, (data) => {
      if (data.count >= config.giftBombThreshold) {
        this.startDance();
      }
    });

    EventBus.on(GardenEvents.WIND_CHANGE, (offset) => {
      this.windOffset = offset;
    });

    // Sync Growth between front and back vines
    EventBus.on(GardenEvents.VINE_GROWTH, (value) => {
      this.setGrowth(value);
    });

    EventBus.on(GardenEvents.STREAM_OFFLINE, () => {
      PersistenceManager.clear();
    });
  }
  restoreFromPersistence() {
    const state = PersistenceManager.load();
    if (state) {
      console.log('[Garden] Restoring from persistence...', state);
      this.setGrowth(state.growth);
      this.flowerManager.restoreState(state);
    }
  }
  resize(width, height) {
    this.backVine.resize(width, height);
    this.frontVine.resize(width, height);
  }
  startDance() {
    if (this.isDancing) return;

    this.isDancing = true;
    this.danceEndTime = performance.now() + config.dance.duration;

    EventBus.emit(GardenEvents.DANCE_START);
    console.log('[Garden] Dance started!');

    this.flowerManager.triggerWiggle();
  }
  stopDance() {
    this.isDancing = false;
    EventBus.emit(GardenEvents.DANCE_END);
    console.log('[Garden] Dance ended');
  }
  setGrowth(value) {
    // Clamp value
    const growth = Math.max(0, Math.min(config.vine.maxGrowth, value));

    // Update both vines
    this.frontVine.setGrowth(growth);
    this.backVine.setGrowth(growth);
  }
  getGrowth() {
    return this.frontVine.getGrowth();
  }
  update(time, deltaTime) {
    let danceWind = 0;
    if (this.isDancing) {
      if (performance.now() >= this.danceEndTime) {
        this.stopDance();
      } else {
        danceWind = Math.sin(time * config.dance.bounceSpeed) * config.dance.intensity * 20;
      }
    }

    const currentWind = this.windOffset + danceWind;

    // Back vine: slower speed + phase offset for independent motion (not lockstep)
    const backVineTime = time * 0.7 + 500; // +500 ensures completely different phase
    this.backVine.update(backVineTime, deltaTime, currentWind * 0.5);
    this.frontVine.update(time, deltaTime, currentWind);
    this.flowerManager.update(deltaTime, currentWind);
  }
  getVine() {
    return this.frontVine;
  }
  getFlowerManager() {
    return this.flowerManager;
  }

  destroy() {
    this.flowerManager.destroy();
    this.frontVine.destroy();
    this.backVine.destroy();
    super.destroy();
  }
}
