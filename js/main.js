import { Application } from './core/Application.js';
import { assetLoader } from './core/AssetLoader.js';
import { EventBus, GardenEvents } from './core/EventBus.js';
import { StreamerbotClient } from './connection/StreamerbotClient.js';
import { Garden } from './garden/Garden.js';
import { ParticleManager } from './effects/ParticleManager.js';
import { WindSway } from './effects/WindSway.js';
import { DanceEffect } from './effects/DanceEffect.js';
import { CommandHandler } from './commands/CommandHandler.js';
import { DebugUI } from './debug/panel/DebugUI.js';
import { setupDebugControls } from './debug/DebugControls.js';
import { config } from './config.js';

// Expose critical globals to window immediately for console access
window.EventBus = EventBus;
window.GardenEvents = GardenEvents;

class LivingGarden {
  app;
  streamerbotClient;
  garden;
  particleManager;
  windSway;
  danceEffect;
  commandHandler;
  debugUI;

  constructor() {
    this.app = new Application();
    this.streamerbotClient = new StreamerbotClient({
      host: config.streamerbot.host,
      port: config.streamerbot.port,
      endpoint: config.streamerbot.endpoint,
    });
    this.setupEventListeners();
  }

  setupEventListeners() {
    EventBus.on(GardenEvents.RAID, (data) => {
      console.log(`[LivingGarden] Raid received! Viewers: ${data.viewers}`);
      this.windSway.forceGust(performance.now() * 0.001, 2.5);
      this.particleManager.emitPetalRain(100);
    });

    EventBus.on(GardenEvents.SUBSCRIPTION, (data) => {
      console.log(`[LivingGarden] Subscription received from ${data.displayName}`);
      this.windSway.forceGust(performance.now() * 0.001, 1.8);
      this.particleManager.emitPetals(Math.random() * window.innerWidth, 0, 20);
    });

    EventBus.on(GardenEvents.CHEER, (data) => {
      const flower = this.garden.getFlowerManager().getFlower(data.userId);
      if (flower) {
        this.particleManager.emitSparkles(flower.x, flower.y, 40);
      }
    });
  }

  async init() {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Could not find #app container');
    }

    await this.app.init(container);

    assetLoader.setRenderer(this.app.renderer);
    await assetLoader.loadAssets();

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

    setupDebugControls({
      garden: this.garden,
      particleManager: this.particleManager,
      windSway: this.windSway,
      app: this.app
    });

    this.debugUI = new DebugUI({
      garden: this.garden,
      particleManager: this.particleManager,
      windSway: this.windSway,
      danceEffect: this.danceEffect,
      streamerbotClient: this.streamerbotClient,
      ticker: this.app.ticker,
    });
    window.debugUI = this.debugUI;

    try {
      await this.streamerbotClient.connect();
    } catch (error) {
      console.warn('[LivingGarden] Could not connect to Streamerbot:', error);
      console.log('[LivingGarden] Running in standalone mode');
    }

    console.log('[LivingGarden] Initialized successfully');
  }

  update(deltaTime) {
    const time = performance.now() * 0.001;
    this.windSway.update(time);
    this.garden.update(time, deltaTime);
    this.particleManager.update(deltaTime);
    this.danceEffect.update(deltaTime);
    if (this.debugUI) this.debugUI.update();
  }

  getGarden() {
    return this.garden;
  }

  destroy() {
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

window.garden = livingGarden;
