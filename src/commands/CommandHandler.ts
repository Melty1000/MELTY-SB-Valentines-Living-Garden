import { EventBus, GardenEvents } from '../core/EventBus';
import { CommandRegistry, type CommandContext, type RegisteredCommand } from './CommandRegistry';
import type { CommandEventData } from '../connection/types';
import type { Garden } from '../garden/Garden';
import type { ParticleManager } from '../effects/ParticleManager';
import type { WindSway } from '../effects/WindSway';

export class CommandHandler {
  private garden: Garden;
  private particleManager: ParticleManager;
  private windSway: WindSway;

  constructor(garden: Garden, particleManager: ParticleManager, windSway: WindSway) {
    this.garden = garden;
    this.particleManager = particleManager;
    this.windSway = windSway;

    this.registerDefaultCommands();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on<CommandEventData>(GardenEvents.COMMAND, (data) => {
      this.handleCommand(data);
    });
  }

  private handleCommand(data: CommandEventData): void {
    const command = CommandRegistry.get(data.command);
    if (!command) {
      console.log(`[CommandHandler] Unknown command: ${data.command}`);
      return;
    }

    const context: CommandContext = {
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

  private registerDefaultCommands(): void {
    const wiggleCommand: RegisteredCommand = {
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

    const wiggleAllCommand: RegisteredCommand = {
      name: 'wiggleall',
      description: 'Makes all flowers wiggle (moderator only)',
      aliases: ['shakeall'],
      execute: (_context) => {
        this.garden.getFlowerManager().triggerWiggle();
      },
    };

    const sparkleCommand: RegisteredCommand = {
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

    const danceCommand: RegisteredCommand = {
      name: 'dance',
      description: 'Starts the garden dance',
      aliases: ['party'],
      execute: (_context) => {
        this.garden.startDance();
      },
    };

    const gustCommand: RegisteredCommand = {
      name: 'gust',
      description: 'Creates a wind gust',
      aliases: ['wind', 'blow'],
      execute: (context) => {
        const intensity = context.args[0] ? parseFloat(context.args[0]) : 1;
        const clampedIntensity = Math.max(0.5, Math.min(2, intensity));
        this.windSway.forceGust(clampedIntensity);
      },
    };

    const heartCommand: RegisteredCommand = {
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

    CommandRegistry.register(wiggleCommand);
    CommandRegistry.register(wiggleAllCommand);
    CommandRegistry.register(sparkleCommand);
    CommandRegistry.register(danceCommand);
    CommandRegistry.register(gustCommand);
    CommandRegistry.register(heartCommand);
  }

  registerCommand(command: RegisteredCommand): void {
    CommandRegistry.register(command);
  }

  destroy(): void {
    CommandRegistry.clear();
  }
}
