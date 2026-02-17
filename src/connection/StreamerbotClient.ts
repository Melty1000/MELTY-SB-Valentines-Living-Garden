import { StreamerbotClient as SBClient } from '@streamerbot/client';
import { EventBus, GardenEvents } from '../core/EventBus';
import { EventMapper } from './EventMapper';
import { config } from '../config';
import type { StreamerbotConfig } from './types';

export class StreamerbotClient {
  private client: SBClient | null = null;
  private eventMapper: EventMapper;
  private config: StreamerbotConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 3000;
  private broadcasterName: string | null = null;
  private broadcasterId: string | null = null;
  private isClientConnected: boolean = false;
  private isConnecting: boolean = false;
  private hasSubscribedEvents: boolean = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: StreamerbotConfig) {
    this.config = config;
    this.eventMapper = new EventMapper();
  }

  private createClient(): SBClient {
    return new SBClient({
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
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  async connect(): Promise<void> {
    if (this.isClientConnected || this.isConnecting) {
      return;
    }

    this.clearReconnectTimer();
    this.isConnecting = true;

    try {
      if (!this.client) {
        this.client = this.createClient();
        this.hasSubscribedEvents = false;
      }

      await this.client.connect();
      if (!this.hasSubscribedEvents) {
        this.subscribeToEvents();
        this.hasSubscribedEvents = true;
      }
    } catch (error) {
      console.error('[StreamerbotClient] Connection failed:', error);
      if (this.client) {
        try {
          this.client.disconnect();
        } catch {
          // Ignore cleanup failures and continue reconnect flow.
        }
      }
      this.client = null;
      this.hasSubscribedEvents = false;
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
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

    this.client.on('Twitch.Raid', (data) => {
      this.handleRawEvent('raid', data);
    });

    this.client.on('Twitch.StreamOffline', (data) => {
      this.handleRawEvent('streamOffline', data);
    });

    this.client.on('General.Custom', (data) => {
      this.eventMapper.mapStreamerbotEvent(data);
    });
  }

  private handleRawEvent(type: string, rawData: unknown): void {
    const data = rawData as any;
    // console.log('[StreamerbotClient] Raw Event:', type, JSON.stringify(data)); // Verbose Debug

    const getIdentity = (d: any) => {
      const user = d.user || d.message?.user || d.data?.user || d.data?.message?.user || {};
      const core = d.data || d;
      const msg = d.message || d.data?.message || {};

      return {
        userId: String(core.userId || core.user_id || core.id || user.id || user.userId || user.user_id || ''),
        userName: String(core.userName || core.user_name || user.login || user.name || user.userName || user.user_name || ''),
        displayName: String(core.displayName || core.display_name || user.displayName || user.display_name || user.name || ''),
        color: core.color || user.color || d.color || msg.user_color || d.user_color || user.user_color,
      };
    };

    const identity = getIdentity(data);

    switch (type) {
      case 'chatMessage': {
        const lowerConfigName = (this.config.broadcasterName || '').toLowerCase();
        const lowerBroadcasterName = (this.broadcasterName || '').toLowerCase();
        const lowerIdentityName = identity.userName.toLowerCase();

        // Access the actual message object from the raw event structure
        const msgObj = data.message || data.data?.message || {};
        const msgText = msgObj.message || msgObj.text || '';
        const badges = msgObj.badges || data.badges || [];

        const isBroadcaster =
          (lowerConfigName && lowerIdentityName === lowerConfigName) ||
          (lowerBroadcasterName && lowerIdentityName === lowerBroadcasterName && lowerBroadcasterName !== 'streamer.bot') ||
          (this.broadcasterId && identity.userId === this.broadcasterId) ||
          badges.some((b: any) =>
            b.name === 'broadcaster' || b.id === 'broadcaster' || b.type === 'broadcaster'
          );

        if (isBroadcaster && identity.color) {
          // console.log(`[StreamerbotClient] Broadcaster detected! Syncing color: ${identity.color}`);
          EventBus.emit(GardenEvents.BROADCASTER_COLOR, { color: identity.color });
        }

        const isMod = badges.some((b: any) =>
          b.name === 'moderator' || b.id === 'moderator' || b.type === 'moderator'
        );

        this.eventMapper.mapStreamerbotEvent({
          event: 'chatter',
          data: {
            ...identity,
            messageCount: data.messageCount || 1,
            isMod,
            isBroadcaster,
            milestones: data.milestones || config.milestones,
            message: msgText // Pass actual message string
          },
        });

        break;
      }

      case 'sub':
      case 'resub':
        this.eventMapper.mapStreamerbotEvent({
          event: 'subscription',
          data: {
            ...identity,
            tier: data.tier || '1000',
            isGift: false,
            cumulativeMonths: data.cumulativeMonths || data.cumulative_months,
          },
        });
        break;

      case 'giftSub': {
        const recipient = getIdentity(data.recipient || data);
        this.eventMapper.mapStreamerbotEvent({
          event: 'subscription',
          data: {
            userId: recipient.userId,
            userName: recipient.userName,
            displayName: recipient.displayName,
            tier: data.tier || '1000',
            isGift: true,
            gifterName: identity.displayName || identity.userName,
          },
        });
        break;
      }

      case 'giftBomb':
        this.eventMapper.mapStreamerbotEvent({
          event: 'giftBomb',
          data: {
            ...identity,
            count: data.gifts || data.total || 1,
            tier: data.tier || '1000',
          },
        });
        break;

      case 'follow':
        this.eventMapper.mapStreamerbotEvent({
          event: 'follow',
          data: {
            ...identity,
          },
        });
        break;

      case 'cheer':
        this.eventMapper.mapStreamerbotEvent({
          event: 'cheer',
          data: {
            ...identity,
            bits: data.bits || 0,
            message: data.message || '',
          },
        });
        break;

      case 'raid':
        this.eventMapper.mapStreamerbotEvent({
          event: 'raid',
          data: {
            ...identity,
            viewers: data.viewers || 0,
          },
        });
        break;

      case 'streamOffline':
        EventBus.emit(GardenEvents.STREAM_OFFLINE);
        break;
    }
  }

  private async onConnect(): Promise<void> {
    console.log('[StreamerbotClient] Connected to Streamerbot endpoint');
    this.clearReconnectTimer();
    this.isConnecting = false;
    this.isClientConnected = true;
    this.reconnectAttempts = 0;
    EventBus.emit(GardenEvents.CONNECTED);

    if (this.client) {
      try {
        console.log('[StreamerbotClient] Syncing broadcaster identity...');

        // 1. Initial Info for system state
        const infoResponse = await this.client.getInfo() as any;
        const sysInfo = infoResponse.info || infoResponse;

        // 2. Explicitly request GetBroadcaster
        try {
          const bcResponse = await this.client.request({
            request: 'GetBroadcaster' as any,
          }) as any;

          if (bcResponse && bcResponse.status === 'ok') {
            // Mapping for SB 1.0.4+ platforms structure
            const twitch = bcResponse.platforms?.twitch;
            if (twitch) {
              this.broadcasterId = String(twitch.broadcastUserId || '');
              this.broadcasterName = twitch.broadcastUser || twitch.broadcastUserName;
              console.log(`[StreamerbotClient] Broadcaster identified: ${this.broadcasterName} (${this.broadcasterId})`);
            }
          }
        } catch {
          console.warn('[StreamerbotClient] GetBroadcaster request failed');
        }

        // 3. Fallback to System Info if needed
        if (!this.broadcasterName && sysInfo.user) {
          const b = sysInfo.user;
          if (b.name !== 'Streamer.bot') {
            this.broadcasterId = String(b.id || b.userId || '');
            this.broadcasterName = b.name || b.userName;
          }
        }

        // 4. Config Fallback
        if (!this.broadcasterName && this.config.broadcasterName) {
          this.broadcasterName = this.config.broadcasterName;
          console.log(`[StreamerbotClient] Using config broadcaster: ${this.broadcasterName}`);
        }

      } catch (err) {
        console.warn('[StreamerbotClient] onConnect failed:', err);
      }
    }
  }

  private onDisconnect(): void {
    console.log('[StreamerbotClient] Disconnected from Streamerbot');
    this.isConnecting = false;
    this.isClientConnected = false;
    EventBus.emit(GardenEvents.DISCONNECTED);
  }

  private onError(error: Error): void {
    console.error('[StreamerbotClient] Error:', error);
    EventBus.emit(GardenEvents.ERROR, error);
  }

  private scheduleReconnect(): void {
    if (this.isClientConnected || this.isConnecting) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    if (this.reconnectTimer !== null) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.isConnecting = false;
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.hasSubscribedEvents = false;
    this.isClientConnected = false;
  }

  async getViewers(): Promise<{ userId: string; userName: string; }[]> {
    if (!this.client || !this.isClientConnected) return [];

    try {
      // Try generic GetViewers first (custom actions often map to this)
      let response = await (this.client.request({ request: 'GetViewers' } as any).catch(() => null)) as any;

      // Fallback: GetTwitchChatters (Native in some versions)
      if (!response) {
        response = await (this.client.request({ request: 'GetTwitchChatters' } as any).catch(() => null)) as any;
      }

      if (response && (response.viewers || response.chatters)) {
        const list = response.viewers || response.chatters || [];
        // Map to consistent structure
        return list.map((v: any) => ({
          userId: String(v.userId || v.id),
          userName: v.userName || v.login || v.name
        }));
      }
      return [];
    } catch {
      // Suppress annoying warning if not supported
      // console.warn('[StreamerbotClient] GetViewers request failed:', error);
      return [];
    }
  }

  isConnected(): boolean {
    return this.isClientConnected;
  }
}
