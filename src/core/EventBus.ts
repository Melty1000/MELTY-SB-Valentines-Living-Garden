type EventCallback<T = unknown> = (data: T) => void;

interface EventSubscription {
  unsubscribe: () => void;
}

class EventBusClass {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback as EventCallback);

    return {
      unsubscribe: () => {
        callbacks.delete(callback as EventCallback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      },
    };
  }

  once<T = unknown>(event: string, callback: EventCallback<T>): EventSubscription {
    const subscription = this.on<T>(event, (data) => {
      subscription.unsubscribe();
      callback(data);
    });
    return subscription;
  }

  emit<T = unknown>(event: string, data?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  off(event: string): void {
    this.listeners.delete(event);
  }

  clear(): void {
    this.listeners.clear();
  }

  createTracker(): { on: EventBusClass['on']; unsubscribeAll: () => void } {
    const subs: EventSubscription[] = [];
    return {
      on: <T = unknown>(event: string, callback: EventCallback<T>) => {
        const sub = this.on(event, callback);
        subs.push(sub);
        return sub;
      },
      unsubscribeAll: () => {
        subs.forEach((s) => s.unsubscribe());
        subs.length = 0;
      },
    };
  }
}

export const EventBus = new EventBusClass();

export const GardenEvents = {
  CHATTER: 'garden:chatter',
  SUBSCRIPTION: 'garden:subscription',
  GIFT_BOMB: 'garden:giftBomb',
  FOLLOW: 'garden:follow',
  CHEER: 'garden:cheer',
  COMMAND: 'garden:command',
  RAID: 'garden:raid',
  FLOWER_SPAWN: 'garden:flowerSpawn',
  FLOWER_GROW: 'garden:flowerGrow',
  HEART_SPAWN: 'garden:heartSpawn',
  PETAL_SPAWN: 'garden:petalSpawn',
  PETAL_RAIN: 'garden:petalRain', // New: Falling petals
  VINE_GROWTH: 'garden:vineGrowth', // New: Decoupled sync
  DANCE_START: 'garden:danceStart',
  DANCE_END: 'garden:danceEnd',
  WIND_CHANGE: 'garden:windChange',
  BROADCASTER_COLOR: 'garden:broadcasterColor',
  STREAM_OFFLINE: 'garden:streamOffline', // New: Clear persistence
  CONNECTED: 'connection:connected',
  DISCONNECTED: 'connection:disconnected',
  ERROR: 'connection:error',
} as const;
