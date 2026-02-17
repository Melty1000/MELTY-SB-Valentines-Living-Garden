import { EventBus, GardenEvents } from '../core/EventBus';
import type {
  GardenEvent,
  ChatterEventData,
  SubscriptionEventData,
  GiftBombEventData,
  FollowEventData,
  CheerEventData,
  RaidEventData,
  CommandEventData,
} from './types';

export class EventMapper {
  mapStreamerbotEvent(rawEvent: unknown): void {
    if (!this.isGardenEvent(rawEvent)) {
      return;
    }

    const event = rawEvent as GardenEvent;

    switch (event.event) {
      case 'chatter':
        this.handleChatter(event.data as ChatterEventData);
        break;
      case 'subscription':
        this.handleSubscription(event.data as SubscriptionEventData);
        break;
      case 'giftBomb':
        this.handleGiftBomb(event.data as GiftBombEventData);
        break;
      case 'follow':
        this.handleFollow(event.data as FollowEventData);
        break;
      case 'cheer':
        this.handleCheer(event.data as CheerEventData);
        break;
      case 'raid':
        this.handleRaid(event.data as RaidEventData);
        break;
      case 'command':
        this.handleCommand(event.data as CommandEventData);
        break;
    }
  }

  private isGardenEvent(data: unknown): data is GardenEvent {
    return (
      typeof data === 'object' &&
      data !== null &&
      'event' in data &&
      'data' in data
    );
  }

  private handleChatter(data: ChatterEventData): void {
    if (!data || !data.userId) {
      console.warn('[EventMapper] Ignoring malformed Chatter event. Missing userId. Keys:', data ? Object.keys(data) : 'null', data);
      return;
    }
    console.log(`[EventMapper] Chatter: ${data.displayName} (${data.messageCount} messages)`);
    EventBus.emit(GardenEvents.CHATTER, data);
  }

  private handleSubscription(data: SubscriptionEventData): void {
    console.log(`[EventMapper] Subscription: ${data.displayName} (Tier ${data.tier})`);
    EventBus.emit(GardenEvents.SUBSCRIPTION, data);
  }

  private handleGiftBomb(data: GiftBombEventData): void {
    console.log(`[EventMapper] Gift Bomb: ${data.displayName} gifted ${data.count}`);
    EventBus.emit(GardenEvents.GIFT_BOMB, data);
  }

  private handleFollow(data: FollowEventData): void {
    console.log(`[EventMapper] Follow: ${data.displayName}`);
    EventBus.emit(GardenEvents.FOLLOW, data);
  }

  private handleCheer(data: CheerEventData): void {
    console.log(`[EventMapper] Cheer: ${data.displayName} cheered ${data.bits} bits`);
    EventBus.emit(GardenEvents.CHEER, data);
  }

  private handleRaid(data: RaidEventData): void {
    console.log(`[EventMapper] Raid: ${data.displayName} with ${data.viewers} viewers`);
    EventBus.emit(GardenEvents.RAID, data);
  }

  private handleCommand(data: CommandEventData): void {
    console.log(`[EventMapper] Command: ${data.command} from ${data.displayName}`);
    EventBus.emit(GardenEvents.COMMAND, data);
  }
}
