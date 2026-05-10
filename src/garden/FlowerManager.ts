import { Container } from 'pixi.js';
import { Flower } from './Flower';
import { GlowingHeart } from './GlowingHeart';
import { Vine } from './Vine';
import { EventBus, GardenEvents } from '../core/EventBus';
import { userIdToColor } from '../utils/colors';
import { config } from '../config';
import type { ChatterEventData, SubscriptionEventData } from '../connection/types';

export class FlowerManager extends Container {
  private flowers: Map<string, Flower> = new Map();
  private hearts: Map<string, GlowingHeart> = new Map();
  private vine: Vine;

  constructor(vine: Vine) {
    super();
    this.vine = vine;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    EventBus.on<ChatterEventData>(GardenEvents.CHATTER, (data) => {
      this.handleChatter(data);
    });

    EventBus.on<SubscriptionEventData>(GardenEvents.SUBSCRIPTION, (data) => {
      this.handleSubscription(data);
    });
  }

  private handleChatter(data: ChatterEventData): void {
    let flower = this.flowers.get(data.userId);

    if (!flower) {
      const newFlower = this.spawnFlower(data);
      if (newFlower) {
        flower = newFlower;
        EventBus.emit(GardenEvents.FLOWER_SPAWN, { flower, data });
      }
    }

    if (flower) {
      const prevStage = flower.stage;
      flower.updateFromMessageCount(data.messageCount, data.milestones);

      if (flower.stage !== prevStage) {
        EventBus.emit(GardenEvents.FLOWER_GROW, { flower, data, stage: flower.stage });
      }
    }
  }

  private spawnFlower(data: ChatterEventData): Flower | null {
    const branch = this.vine.getAvailableBranch();
    if (!branch) {
      console.warn('[FlowerManager] No available branches for new flower');
      return null;
    }

    const color = userIdToColor(data.userId);
    const size = config.flower.minSize + Math.random() * (config.flower.maxSize - config.flower.minSize);

    const flower = new Flower(
      {
        userId: data.userId,
        userName: data.userName,
        displayName: data.displayName,
        messageCount: data.messageCount,
      },
      color,
      size
    );

    const attachPoint = branch.getAttachmentPoint();
    flower.x = attachPoint.x;
    flower.y = attachPoint.y;
    branch.setOccupied(true);

    flower.updateFromMessageCount(data.messageCount, data.milestones);

    this.flowers.set(data.userId, flower);
    this.addChild(flower);

    console.log(`[FlowerManager] Spawned flower for ${data.displayName}`);
    return flower;
  }

  private handleSubscription(data: SubscriptionEventData): void {
    if (this.hearts.has(data.userId)) {
      return;
    }

    const heart = this.spawnHeart(data);
    if (heart) {
      EventBus.emit(GardenEvents.HEART_SPAWN, { heart, data });
    }
  }

  private spawnHeart(data: SubscriptionEventData): GlowingHeart | null {
    const branch = this.vine.getAvailableBranch();
    if (!branch) {
      console.warn('[FlowerManager] No available branches for heart');
      return null;
    }

    const heart = new GlowingHeart({
      userId: data.userId,
      userName: data.userName,
      tier: data.tier,
    });

    const attachPoint = branch.getAttachmentPoint();
    heart.attachToPosition(attachPoint.x, attachPoint.y);
    branch.setOccupied(true);

    this.hearts.set(data.userId, heart);
    this.addChild(heart);

    console.log(`[FlowerManager] Spawned heart for ${data.displayName}`);
    return heart;
  }

  getFlower(userId: string): Flower | undefined {
    return this.flowers.get(userId);
  }

  getHeart(userId: string): GlowingHeart | undefined {
    return this.hearts.get(userId);
  }

  getAllFlowers(): Flower[] {
    return Array.from(this.flowers.values());
  }

  getAllHearts(): GlowingHeart[] {
    return Array.from(this.hearts.values());
  }

  getFullyBloomedFlowers(): Flower[] {
    return this.getAllFlowers().filter((f) => f.isFullyBloomed());
  }

  triggerWiggle(userId?: string): void {
    if (userId) {
      const flower = this.flowers.get(userId);
      if (flower) {
        flower.startWobble(1);
      }
    } else {
      for (const flower of this.flowers.values()) {
        flower.startWobble(0.5 + Math.random() * 0.5);
      }
    }
  }

  update(deltaTime: number, windOffset: number = 0): void {
    for (const flower of this.flowers.values()) {
      flower.update(deltaTime, windOffset);
    }

    for (const heart of this.hearts.values()) {
      heart.update(deltaTime, windOffset);
    }
  }

  destroy(): void {
    for (const flower of this.flowers.values()) {
      flower.destroy();
    }
    for (const heart of this.hearts.values()) {
      heart.destroy();
    }
    this.flowers.clear();
    this.hearts.clear();
    super.destroy();
  }
}
