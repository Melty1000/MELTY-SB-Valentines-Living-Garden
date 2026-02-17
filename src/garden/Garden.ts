import { Container, BlurFilter } from 'pixi.js';
import { Vine } from './Vine';
import { FlowerManager } from './flowers/FlowerManager';
import { EventBus, GardenEvents } from '../core/EventBus';
import type { GiftBombEventData } from '../connection/types';
import { config } from '../config';
import { PersistenceManager } from '../core/PersistenceManager';

const debugEnabled = config.debug.enableUI;

export class Garden extends Container {
  private frontVine: Vine;
  private backVine: Vine;
  private flowerManager: FlowerManager;
  private windOffset: number = 0;
  public isDancing: boolean = false;
  private danceEndTime: number = 0;

  constructor(width: number, height: number, renderer?: any) {
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

  public setStreamerbotClient(client: any): void {
    this.flowerManager.setStreamerbotClient(client);
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

    // Sync Growth between front and back vines
    EventBus.on(GardenEvents.VINE_GROWTH, (value: number) => {
      this.setGrowth(value);
    });

    EventBus.on(GardenEvents.STREAM_OFFLINE, () => {
      console.log('[Garden] Stream offline event received. Resetting garden state.');
      this.flowerManager.clear({
        archiveRemovedFlowers: false,
        clearArchivedFlowers: true,
        clearIgnoredUsers: true,
        rotateStreamSeed: true,
      });
      this.setGrowth(config.vine.defaultGrowth);
      PersistenceManager.clear();
      // Optional: reload page to ensure clean slate?
      // window.location.reload(); 
    });
  }

  private restoreFromPersistence(): void {
    const state = PersistenceManager.load();
    if (state) {
      console.log('[Garden] Restoring from persistence...', state);
      // Safety: Ensure growth has a floor of 0.05 so the vine is at least visible on launch
      const growth = Math.max(0.05, state.growth || 0);
      this.setGrowth(growth);
      this.flowerManager.restoreState(state);
    }

    if (debugEnabled) {
      // Expose a way to clear state if it's corrupted
      (window as any).clearGardenState = () => {
        PersistenceManager.clear();
        window.location.reload();
      };
    }
  }

  public resize(width: number, height: number): void {
    this.backVine.resize(width, height);
    this.frontVine.resize(width, height);
  }

  public startDance(): void {
    if (this.isDancing) return;

    this.isDancing = true;
    this.danceEndTime = performance.now() + config.dance.duration;

    EventBus.emit(GardenEvents.DANCE_START);
    console.log('[Garden] Dance started!');

    this.flowerManager.triggerWiggle();
  }

  public stopDance(): void {
    this.isDancing = false;
    EventBus.emit(GardenEvents.DANCE_END);
    console.log('[Garden] Dance ended');
  }

  public setGrowth(value: number): void {
    // Clamp value
    const growth = Math.max(0, Math.min(config.vine.maxGrowth, value));

    // Update both vines
    this.frontVine.setGrowth(growth);
    this.backVine.setGrowth(growth);
  }

  public getGrowth(): number {
    return this.frontVine.getGrowth();
  }

  public update(time: number, deltaTime: number): void {
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

  public getVine(): Vine {
    return this.frontVine;
  }

  public getFlowerManager(): FlowerManager {
    return this.flowerManager;
  }

  destroy(): void {
    this.flowerManager.destroy();
    this.frontVine.destroy();
    this.backVine.destroy();
    super.destroy();
  }
}
