export interface ChatterEventData {
  userId: string;
  userName: string;
  displayName: string;
  color?: string;
  messageCount: number;
  milestones: {
    bud: number;
    bloom: number;
    full: number;
  };
}

export interface SubscriptionEventData {
  userId: string;
  userName: string;
  displayName: string;
  tier: '1000' | '2000' | '3000' | 'Prime';
  isGift: boolean;
  gifterName?: string;
  cumulativeMonths?: number;
}

export interface GiftBombEventData {
  userId: string;
  userName: string;
  displayName: string;
  count: number;
  tier: '1000' | '2000' | '3000';
}

export interface FollowEventData {
  userId: string;
  userName: string;
  displayName: string;
}

export interface CheerEventData {
  userId: string;
  userName: string;
  displayName: string;
  bits: number;
  message: string;
}

export interface CommandEventData {
  userId: string;
  userName: string;
  displayName: string;
  command: string;
  args: string[];
}

export type GardenEventType =
  | 'chatter'
  | 'subscription'
  | 'giftBomb'
  | 'follow'
  | 'cheer'
  | 'command';

export interface GardenEvent<T = unknown> {
  event: GardenEventType;
  data: T;
}

export interface StreamerbotConfig {
  host: string;
  port: number;
  endpoint: string;
  broadcasterName?: string;
}
