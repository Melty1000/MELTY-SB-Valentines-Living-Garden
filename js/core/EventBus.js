class EventBusClass {
  listeners = new Map();

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const callbacks = this.listeners.get(event);
    callbacks.add(callback);

    return {
      unsubscribe: () => {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(event);
        }
      },
    };
  }

  once(event, callback) {
    const subscription = this.on(event, (data) => {
      subscription.unsubscribe();
      callback(data);
    });
    return subscription;
  }

  emit(event, data) {
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

  off(event) {
    this.listeners.delete(event);
  }

  clear() {
    this.listeners.clear();
  }

  createTracker() {
    const subs = [];
    return {
      on: (event, callback) => {
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
  PETAL_RAIN: 'garden:petalRain',
  VINE_GROWTH: 'garden:vineGrowth',
  DANCE_START: 'garden:danceStart',
  DANCE_END: 'garden:danceEnd',
  WIND_CHANGE: 'garden:windChange',
  BROADCASTER_COLOR: 'garden:broadcasterColor',
  STREAM_OFFLINE: 'garden:streamOffline',
  CONNECTED: 'connection:connected',
  DISCONNECTED: 'connection:disconnected',
  ERROR: 'connection:error',
};
