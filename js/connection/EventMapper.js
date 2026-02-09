import { EventBus, GardenEvents } from '../core/EventBus.js';
export class EventMapper {
  mapStreamerbotEvent(rawEvent) {
    if (!this.isGardenEvent(rawEvent)) {
      return;
    }

    const event = rawEvent;

    switch (event.event) {
      case 'chatter':
        this.handleChatter(event.data);
        break;
      case 'subscription':
        this.handleSubscription(event.data);
        break;
      case 'giftBomb':
        this.handleGiftBomb(event.data);
        break;
      case 'follow':
        this.handleFollow(event.data);
        break;
      case 'cheer':
        this.handleCheer(event.data);
        break;
      case 'command':
        this.handleCommand(event.data);
        break;
    }
  }
  isGardenEvent(data) is GardenEvent {
    return (
      typeof data === 'object' &&
      data !== null &&
      'event' in data &&
      'data' in data
    );
  }
  handleChatter(data) {
    if (!data || !data.userId) {
      console.warn('[EventMapper] Ignoring malformed Chatter event. Missing userId. Keys:', data ? Object.keys(data) : 'null', data);
      return;
    }
    console.log(`[EventMapper] Chatter: ${data.displayName} (${data.messageCount} messages)`);
    EventBus.emit(GardenEvents.CHATTER, data);
  }
  handleSubscription(data) {
    console.log(`[EventMapper] Subscription: ${data.displayName} (Tier ${data.tier})`);
    EventBus.emit(GardenEvents.SUBSCRIPTION, data);
  }
  handleGiftBomb(data) {
    console.log(`[EventMapper] Gift Bomb: ${data.displayName} gifted ${data.count}`);
    EventBus.emit(GardenEvents.GIFT_BOMB, data);
  }
  handleFollow(data) {
    console.log(`[EventMapper] Follow: ${data.displayName}`);
    EventBus.emit(GardenEvents.FOLLOW, data);
  }
  handleCheer(data) {
    console.log(`[EventMapper] Cheer: ${data.displayName} cheered ${data.bits} bits`);
    EventBus.emit(GardenEvents.CHEER, data);
  }
  handleCommand(data) {
    console.log(`[EventMapper] Command: ${data.command} from ${data.displayName}`);
    EventBus.emit(GardenEvents.COMMAND, data);
  }
}
