;
}

export type GardenEventType =
  | 'chatter'
  | 'subscription'
  | 'giftBomb'
  | 'follow'
  | 'cheer'
  | 'command';

export interface GardenEvent {
  event;
  data;
}

