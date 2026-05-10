import { StreamerbotClient as SBClient } from '@streamerbot/client';
import { EventBus, GardenEvents } from '../core/EventBus';
import { EventMapper } from './EventMapper';
import type { StreamerbotConfig } from './types';

export class StreamerbotClient {
  private client: SBClient | null = null;
  private eventMapper: EventMapper;
  private config: StreamerbotConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 3000;

  constructor(config: StreamerbotConfig) {
    this.config = config;
    this.eventMapper = new EventMapper();
  }

  async connect(): Promise<void> {
    try {
      this.client = new SBClient({
        host: this.config.host,
        port: this.config.port,
        endpoint: this.config.endpoint,
        immediate: false,
        autoReconnect: true,
        retries: this.maxReconnectAttempts,
        onConnect: () => this.onConnect(),
        onDisconnect: () => this.onDisconnect(),
        onError: (error) => this.onError(error),
      });

      await this.client.connect();
      this.subscribeToEvents();
    } catch (error) {
      console.error('[StreamerbotClient] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private subscribeToEvents(): void {
    if (!this.client) return;

    this.client.on('Twitch.ChatMessage', (data) => {
      this.handleRawEvent('chatMessage', data);
    });

    this.client.on('Twitch.Sub', (data) => {
      this.handleRawEvent('sub', data);
    });

    this.client.on('Twitch.ReSub', (data) => {
      this.handleRawEvent('resub', data);
    });

    this.client.on('Twitch.GiftSub', (data) => {
      this.handleRawEvent('giftSub', data);
    });

    this.client.on('Twitch.GiftBomb', (data) => {
      this.handleRawEvent('giftBomb', data);
    });

    this.client.on('Twitch.Follow', (data) => {
      this.handleRawEvent('follow', data);
    });

    this.client.on('Twitch.Cheer', (data) => {
      this.handleRawEvent('cheer', data);
    });

    // Listen for custom events from Streamerbot actions
    this.client.on('General.Custom', (data) => {
      this.eventMapper.mapStreamerbotEvent(data);
    });
  }

  private handleRawEvent(type: string, rawData: unknown): void {
    const data = rawData as Record<string, unknown>;

    switch (type) {
      case 'chatMessage': {
        const user = data.user as Record<string, unknown> | undefined;
        this.eventMapper.mapStreamerbotEvent({
          event: 'chatter',
          data: {
            userId: data.userId || data.user_id,
            userName: data.userName || data.user_name || user?.login,
            displayName: data.displayName || data.display_name || user?.displayName,
            messageCount: data.messageCount || 1,
            milestones: data.milestones || { bud: 5, bloom: 15, full: 30 },
          },
        });
        break;
      }

      case 'sub':
      case 'resub':
        this.eventMapper.mapStreamerbotEvent({
          event: 'subscription',
          data: {
            userId: data.userId || data.user_id,
            userName: data.userName || data.user_name,
            displayName: data.displayName || data.display_name,
            tier: data.tier || '1000',
            isGift: false,
            cumulativeMonths: data.cumulativeMonths || data.cumulative_months,
          },
        });
        break;

      case 'giftSub':
        this.eventMapper.mapStreamerbotEvent({
          event: 'subscription',
          data: {
            userId: data.recipientUserId || data.recipient_user_id,
            userName: data.recipientUserName || data.recipient_user_name,
            displayName: data.recipientDisplayName || data.recipient_display_name,
            tier: data.tier || '1000',
            isGift: true,
            gifterName: data.userName || data.user_name,
          },
        });
        break;

      case 'giftBomb':
        this.eventMapper.mapStreamerbotEvent({
          event: 'giftBomb',
          data: {
            userId: data.userId || data.user_id,
            userName: data.userName || data.user_name,
            displayName: data.displayName || data.display_name,
            count: data.gifts || data.total || 1,
            tier: data.tier || '1000',
          },
        });
        break;

      case 'follow':
        this.eventMapper.mapStreamerbotEvent({
          event: 'follow',
          data: {
            userId: data.userId || data.user_id,
            userName: data.userName || data.user_name,
            displayName: data.displayName || data.display_name,
          },
        });
        break;

      case 'cheer':
        this.eventMapper.mapStreamerbotEvent({
          event: 'cheer',
          data: {
            userId: data.userId || data.user_id,
            userName: data.userName || data.user_name,
            displayName: data.displayName || data.display_name,
            bits: data.bits || 0,
            message: data.message || '',
          },
        });
        break;
    }
  }

  private onConnect(): void {
    console.log('[StreamerbotClient] Connected to Streamerbot');
    this.reconnectAttempts = 0;
    EventBus.emit(GardenEvents.CONNECTED);
  }

  private onDisconnect(): void {
    console.log('[StreamerbotClient] Disconnected from Streamerbot');
    EventBus.emit(GardenEvents.DISCONNECTED);
  }

  private onError(error: Error): void {
    console.error('[StreamerbotClient] Error:', error);
    EventBus.emit(GardenEvents.ERROR, error);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[StreamerbotClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`[StreamerbotClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
