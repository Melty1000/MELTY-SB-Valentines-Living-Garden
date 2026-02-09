import { EventBus, GardenEvents } from '../core/EventBus.js';
import { CommandRegistry } from './CommandRegistry.js';
export class CommandHandler {
  garden;
  particleManager;
  windSway;
  tracker = EventBus.createTracker();

  constructor(garden, particleManager, windSway) {
    this.garden = garden;
    this.particleManager = particleManager;
    this.windSway = windSway;

    this.registerDefaultCommands();
    this.setupEventListeners();
  }
  setupEventListeners() {
    const { on } = this.tracker;
    on(GardenEvents.COMMAND, (data) => {
      this.handleCommand(data);
    });
  }
  handleCommand(data) {
    const command = CommandRegistry.get(data.command);
    if (!command) {
      console.log(`[CommandHandler] Unknown command: ${data.command}`);
      return;
    }

    const context = {
      userId: data.userId,
      userName: data.userName,
      displayName: data.displayName,
      args: data.args,
    };

    try {
      command.execute(context);
      console.log(`[CommandHandler] Executed command: ${data.command} by ${data.displayName}`);
    } catch (error) {
      console.error(`[CommandHandler] Error executing command ${data.command}:`, error);
    }
  }
  registerDefaultCommands() {
    const wiggleCommand = {
      name: 'wiggle',
      description: 'Makes your flower wiggle',
      aliases: ['shake', 'wave'],
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        if (flower) {
          flower.startWobble(1.5);
        }
      },
    };

    const wiggleAllCommand = {
      name: 'wiggleall',
      description: 'Makes all flowers wiggle (moderator only)',
      aliases: ['shakeall'],
      execute: (_context) => {
        this.garden.getFlowerManager().triggerWiggle();
      },
    };

    const sparkleCommand = {
      name: 'sparkle',
      description: 'Emits sparkles from your flower',
      aliases: ['shine', 'glitter'],
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        if (flower) {
          this.particleManager.emitSparkles(flower.x, flower.y, 20);
        }
      },
    };

    const danceCommand = {
      name: 'dance',
      description: 'Starts the garden dance',
      aliases: ['party'],
      execute: (_context) => {
        this.garden.startDance();
      },
    };

    const gustCommand = {
      name: 'gust',
      description: 'Creates a wind gust',
      aliases: ['wind', 'blow'],
      execute: (context) => {
        const intensity = context.args[0] ? parseFloat(context.args[0]) ;
        const clampedIntensity = Math.max(0.5, Math.min(2, intensity));
        this.windSway.forceGust(performance.now() * 0.001, clampedIntensity);
      },
    };

    const heartCommand = {
      name: 'heart',
      description: 'Emits floating hearts',
      aliases: ['love', 'hearts'],
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        const x = flower ? flower.x : Math.random() * window.innerWidth;
        const y = flower ? flower.y : window.innerHeight * 0.5;
        this.particleManager.emitHearts(x, y, 10);
      },
    };

    const pulseCommand = {
      name: 'pulse',
      description: 'Pulses the flower',
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        if (flower) flower.startWobble(2.0); // Placeholder for pulse
      },
    };

    const bloomCommand = {
      name: 'bloom',
      description: 'Forces flower to bloom',
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        // Direct import of Enum might be needed, or magic number
        // reusing local import if available, otherwise casting
        if (flower) flower.setImmediateStage(4); // Radiant
      },
    };

    const growCommand = {
      name: 'grow',
      description: 'Grows the flower',
      execute: (context) => {
        const flower = this.garden.getFlowerManager().getFlower(context.userId);
        if (flower) {
          const next = Math.min(4, flower.stage + 1);
          flower.setImmediateStage(next);
        }
      },
    };

    CommandRegistry.register(wiggleCommand);
    CommandRegistry.register(wiggleAllCommand);
    CommandRegistry.register(sparkleCommand);
    CommandRegistry.register(danceCommand);
    CommandRegistry.register(gustCommand);
    CommandRegistry.register(heartCommand);
    CommandRegistry.register(pulseCommand);
    CommandRegistry.register(bloomCommand);
    CommandRegistry.register(growCommand);
  }

  registerCommand(command) {
    CommandRegistry.register(command);
  }

  destroy() {
    this.tracker.unsubscribeAll();
    CommandRegistry.clear();
  }
}
