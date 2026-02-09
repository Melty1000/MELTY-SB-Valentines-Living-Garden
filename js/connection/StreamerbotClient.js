import { StreamerbotClient as SBClient } from '@streamerbot/client';
import { EventBus, GardenEvents } from '../core/EventBus.js';
import { EventMapper } from './EventMapper.js';
import { config } from '../config.js';

export class StreamerbotClient {
  client = null;
  eventMapper;
  config;
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelay = 3000;
  broadcasterName = null;
  broadcasterId = null;
  isClientConnected = false;

  constructor(cfg) {
    this.config = cfg;
    this.eventMapper = new EventMapper();
  }

  async connect() {
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

  subscribeToEvents() {
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

  handleRawEvent(type, rawData) {
    const data = rawData;

    const getIdentity = (d) => {
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

        const isBroadcaster =
          (lowerConfigName && lowerIdentityName === lowerConfigName) ||
          (lowerBroadcasterName && lowerIdentityName === lowerBroadcasterName && lowerBroadcasterName !== 'streamer.bot') ||
          (this.broadcasterId && identity.userId === this.broadcasterId) ||
          (data.badges || data.message?.badges || []).some((b) =>
            b.name === 'broadcaster' || b.id === 'broadcaster' || b.type === 'broadcaster'
          );

        if (isBroadcaster && identity.color) {
          console.log(`[StreamerbotClient] Broadcaster detected! Syncing color: ${identity.color}`);
          EventBus.emit(GardenEvents.BROADCASTER_COLOR, { color: identity.color });
        }

        this.eventMapper.mapStreamerbotEvent({
          event: 'chatter',
          data: {
            ...identity,
            messageCount: data.messageCount || 1,
            milestones: data.milestones || config.milestones,
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

  async onConnect() {
    console.log('[StreamerbotClient] Connected to Streamerbot endpoint');
    this.isClientConnected = true;
    this.reconnectAttempts = 0;
    EventBus.emit(GardenEvents.CONNECTED);

    if (this.client) {
      try {
        console.log('[StreamerbotClient] Syncing broadcaster identity...');

        const infoResponse = await this.client.getInfo();
        const sysInfo = infoResponse.info || infoResponse;

        try {
          const bcResponse = await this.client.request({
            request: 'GetBroadcaster',
          });

          if (bcResponse && bcResponse.status === 'ok') {
            const twitch = bcResponse.platforms?.twitch;
            if (twitch) {
              this.broadcasterId = String(twitch.broadcastUserId || '');
              this.broadcasterName = twitch.broadcastUser || twitch.broadcastUserName;
              console.log(`[StreamerbotClient] Broadcaster identified: ${this.broadcasterName} (${this.broadcasterId})`);
            }
          }
        } catch (bcErr) {
          console.warn('[StreamerbotClient] GetBroadcaster request failed');
        }

        if (!this.broadcasterName && sysInfo.user) {
          const b = sysInfo.user;
          if (b.name !== 'Streamer.bot') {
            this.broadcasterId = String(b.id || b.userId || '');
            this.broadcasterName = b.name || b.userName;
          }
        }

        if (!this.broadcasterName && this.config.broadcasterName) {
          this.broadcasterName = this.config.broadcasterName;
          console.log(`[StreamerbotClient] Using config broadcaster: ${this.broadcasterName}`);
        }

      } catch (err) {
        console.warn('[StreamerbotClient] onConnect failed:', err);
      }
    }
  }

  onDisconnect() {
    console.log('[StreamerbotClient] Disconnected from Streamerbot');
    this.isClientConnected = false;
    EventBus.emit(GardenEvents.DISCONNECTED);
  }

  onError(error) {
    console.error('[StreamerbotClient] Error:', error);
    EventBus.emit(GardenEvents.ERROR, error);
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.isClientConnected = false;
  }

  isConnected() {
    return this.isClientConnected;
  }
}
