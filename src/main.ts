import { Application } from './core/Application';
import { assetLoader } from './core/AssetLoader';
import { EventBus, GardenEvents } from './core/EventBus';
import { StreamerbotClient } from './connection/StreamerbotClient';
import { Garden } from './garden/Garden';
import { ParticleManager } from './effects/ParticleManager';
import { WindSway } from './effects/WindSway';
import { DanceEffect } from './effects/DanceEffect';
import { CommandHandler } from './commands/CommandHandler';
import { config } from './config';

class LivingGarden {
  private app: Application;
  private streamerbotClient: StreamerbotClient;
  private garden!: Garden;
  private particleManager!: ParticleManager;
  private windSway!: WindSway;
  private danceEffect!: DanceEffect;
  private commandHandler!: CommandHandler;

  constructor() {
    this.app = new Application();
    this.streamerbotClient = new StreamerbotClient({
      host: config.streamerbot.host,
      port: config.streamerbot.port,
      endpoint: config.streamerbot.endpoint,
    });
  }

  async init(): Promise<void> {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Could not find #app container');
    }

    await this.app.init(container);

    assetLoader.setRenderer(this.app.renderer);
    await assetLoader.loadAssets();

    this.garden = new Garden(this.app.width, this.app.height);
    this.app.addChild(this.garden);

    this.particleManager = new ParticleManager();
    this.app.addChild(this.particleManager);

    this.windSway = new WindSway();

    this.danceEffect = new DanceEffect(this.garden.getFlowerManager());

    this.commandHandler = new CommandHandler(
      this.garden,
      this.particleManager,
      this.windSway
    );

    this.app.ticker.add((ticker) => {
      const deltaTime = ticker.deltaMS;
      this.update(deltaTime);
    });

    this.setupDebugControls();

    try {
      await this.streamerbotClient.connect();
    } catch (error) {
      console.warn('[LivingGarden] Could not connect to Streamerbot:', error);
      console.log('[LivingGarden] Running in standalone mode');
    }

    console.log('[LivingGarden] Initialized successfully');
  }

  private update(deltaTime: number): void {
    this.windSway.update(deltaTime);
    this.garden.update(deltaTime);
    this.particleManager.update(deltaTime);
    this.danceEffect.update(deltaTime);
  }

  private setupDebugControls(): void {
    const debug = {
      spawnTestFlower: () => {
        const testId = `test_${Date.now()}`;
        EventBus.emit(GardenEvents.CHATTER, {
          userId: testId,
          userName: `TestUser${Math.floor(Math.random() * 1000)}`,
          displayName: `TestUser${Math.floor(Math.random() * 1000)}`,
          messageCount: Math.floor(Math.random() * 50) + 1,
          milestones: config.milestones,
        });
      },

      spawnTestHeart: () => {
        const testId = `heart_${Date.now()}`;
        EventBus.emit(GardenEvents.SUBSCRIPTION, {
          userId: testId,
          userName: `SubUser${Math.floor(Math.random() * 1000)}`,
          displayName: `SubUser${Math.floor(Math.random() * 1000)}`,
          tier: ['1000', '2000', '3000'][Math.floor(Math.random() * 3)] as '1000' | '2000' | '3000',
          isGift: false,
        });
      },

      triggerGiftBomb: () => {
        EventBus.emit(GardenEvents.GIFT_BOMB, {
          userId: `gifter_${Date.now()}`,
          userName: 'GenerousGifter',
          displayName: 'GenerousGifter',
          count: 10,
          tier: '1000',
        });
      },

      triggerCommand: (command: string, args: string[] = []) => {
        EventBus.emit(GardenEvents.COMMAND, {
          userId: 'debug_user',
          userName: 'DebugUser',
          displayName: 'DebugUser',
          command,
          args,
        });
      },

      emitSparkles: (x?: number, y?: number) => {
        this.particleManager.emitSparkles(
          x ?? this.app.width / 2,
          y ?? this.app.height / 2,
          30
        );
      },

      emitHearts: (x?: number, y?: number) => {
        this.particleManager.emitHearts(
          x ?? this.app.width / 2,
          y ?? this.app.height / 2,
          15
        );
      },

      forceGust: (intensity = 1) => {
        this.windSway.forceGust(intensity);
      },

      startDance: () => {
        this.garden.startDance();
      },
    };

    (window as unknown as { gardenDebug: typeof debug }).gardenDebug = debug;

    console.log('[LivingGarden] Debug controls available via window.gardenDebug');
    console.log('  gardenDebug.spawnTestFlower()');
    console.log('  gardenDebug.spawnTestHeart()');
    console.log('  gardenDebug.triggerGiftBomb()');
    console.log('  gardenDebug.triggerCommand("wiggle")');
    console.log('  gardenDebug.emitSparkles(x, y)');
    console.log('  gardenDebug.emitHearts(x, y)');
    console.log('  gardenDebug.forceGust(intensity)');
    console.log('  gardenDebug.startDance()');
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    livingGarden.destroy();
  });
}
