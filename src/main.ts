import { Application } from './core/Application';
import { assetLoader } from './core/AssetLoader';
import { EventBus, GardenEvents } from './core/EventBus';
import { StreamerbotClient } from './connection/StreamerbotClient';
import { Garden } from './garden/Garden';
import { ParticleManager } from './effects/ParticleManager';
import { WindSway } from './effects/WindSway';
import { DanceEffect } from './effects/DanceEffect';
import { CommandHandler } from './commands/CommandHandler';
import { DebugUI } from './debug/panel/DebugUI';
import { setupDebugControls } from './debug/DebugControls';
import { config } from './config';

// Expose critical globals to window immediately for console access
(window as any).EventBus = EventBus;
(window as any).GardenEvents = GardenEvents;

class LivingGarden {
  private app: Application;
  private streamerbotClient: StreamerbotClient;
  private garden!: Garden;
  private particleManager!: ParticleManager;
  private windSway!: WindSway;
  private danceEffect!: DanceEffect;
  private commandHandler!: CommandHandler;
  private debugUI!: DebugUI;

  constructor() {
    this.app = new Application();
    this.streamerbotClient = new StreamerbotClient({
      host: config.streamerbot.host,
      port: config.streamerbot.port,
      endpoint: config.streamerbot.endpoint,
    });
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on(GardenEvents.RAID, (data: any) => {
      console.log(`[LivingGarden] Raid received! Viewers: ${data.viewers}`);
      this.windSway.forceGust(performance.now() * 0.001, 2.5);
      // Trigger heavy petal rain (100 particles)
      this.particleManager.emitPetalRain(100);
    });

    EventBus.on(GardenEvents.SUBSCRIPTION, (data: any) => {
      console.log(`[LivingGarden] Subscription received from ${data.displayName}`);
      this.windSway.forceGust(performance.now() * 0.001, 1.8);
      this.particleManager.emitPetals(Math.random() * window.innerWidth, 0, 20);
    });

    EventBus.on(GardenEvents.CHEER, (data: any) => {
      const flower = this.garden.getFlowerManager().getFlower(data.userId);
      if (flower) {
        this.particleManager.emitPetals(flower.x, flower.y, 40, [flower.getColor()]);
      }
    });
  }

  async init(): Promise<void> {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Could not find #app container');
    }

    await this.app.init(container);
    this.app.ticker.maxFPS = config.maxFPS;

    assetLoader.setRenderer(this.app.renderer);
    await assetLoader.loadAssets();

    console.log(`[LivingGarden] Initializing Garden with dimensions: ${this.app.width}x${this.app.height}`);
    this.garden = new Garden(this.app.width, this.app.height, this.app.renderer);
    this.app.addChild(this.garden);

    this.particleManager = new ParticleManager(this.app.renderer);
    this.app.addChild(this.particleManager);

    this.windSway = new WindSway();

    this.danceEffect = new DanceEffect(this.garden.getFlowerManager());

    this.commandHandler = new CommandHandler(
      this.garden,
      this.particleManager,
      this.windSway
    );

    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaMS * 0.001);
    });

    // Extracting debug setup to dedicated module
    setupDebugControls({
      garden: this.garden,
      particleManager: this.particleManager,
      windSway: this.windSway,
      app: this.app
    });

    // Initialize comprehensive Debug UI (F9 to toggle)
    this.debugUI = new DebugUI({
      garden: this.garden,
      particleManager: this.particleManager,
      windSway: this.windSway,
      danceEffect: this.danceEffect,
      streamerbotClient: this.streamerbotClient,
      ticker: this.app.ticker,
    });
    // Expose for console access
    (window as any).debugUI = this.debugUI;

    try {
      await this.streamerbotClient.connect();
    } catch (error) {
      console.warn('[LivingGarden] Could not connect to Streamerbot:', error);
      console.log('[LivingGarden] Running in standalone mode');
    }

    // Inject client into Garden for presence pruning
    this.garden.setStreamerbotClient(this.streamerbotClient);

    console.log('[LivingGarden] Initialized successfully');
  }

  private update(deltaTime: number): void {
    const time = performance.now() * 0.001;
    this.windSway.update(time);
    this.garden.update(time, deltaTime);
    this.particleManager.update(deltaTime);
    this.danceEffect.update(deltaTime);
    if (this.debugUI) this.debugUI.update();
  }

  public getGarden(): Garden {
    return this.garden;
  }

  destroy(): void {
    this.streamerbotClient.disconnect();
    this.commandHandler.destroy();
    this.danceEffect.destroy();
    this.particleManager.destroy();
    this.garden.destroy();
    assetLoader.destroy();
    this.app.destroy();
    EventBus.clear();
  }
}

const livingGarden = new LivingGarden();
livingGarden.init().catch(console.error);

// Expose to window for console control (e.g. window.garden.vine.setGrowth(0.5))
(window as any).garden = livingGarden;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    livingGarden.destroy();
  });
}
